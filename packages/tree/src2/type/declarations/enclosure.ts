import assert from "assert"
import { isNil, last } from "lodash"
import { flow } from "fp-ts/lib/function"

import { Match, Range, typing } from "@december/utils"
import { BasePattern } from "@december/utils/match/base"
import { EQUALS, IS_ELEMENT_OF, IsElementOfSetPattern } from "@december/utils/match/element"
import { AND, OR } from "@december/utils/match/logical"
// import { CONTAINED_IN, ContainedInSetPattern } from "@december/utils/match/set"

import Type from "../base"
import Node, { SubTree } from "../../node"
import type Token from "../../token"
import { getType } from "../../type"
import { EvaluatorOptions } from "../../phases/lexer/evaluation"
import { interleavedInOrder, wrapperInOrder } from "../../node/traversal"
import { RuleSet } from "../../nrs"

import { TYPE, NODE, TREE } from "../../match/pattern"
import { Rule, leftOperand, match, matchInChildren, nextSibling, predicate, filter, ADD_NODE_AT, firstChild, KEEP_NODE } from "../../nrs/rule"
import { KEYWORD_GROUP } from "./keyword"
import { CUSTOM } from "../../phases/reducer/instruction"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const ENCLOSURE_PRIORITY = 10 ** 1
const KEYWORD_PRIORITY = 10 ** 20

export function openerAndCloserAreTheSame(pattern: IsElementOfSetPattern) {
  return pattern.type === `is_element_of` && pattern.superset[0] === pattern.superset[1]
}

export function WrapperEvaluator(token: Token, options: EvaluatorOptions) {
  let variant: null | `intermediary` | `opener` | `closer` | `opener-and-closer` = null

  const lexical = token.type.lexical!
  const [pattern] = lexical.patterns

  assert(lexical.patterns.length === 1, `Unimplemented multiple patterns`)

  const value = token.lexeme

  if (pattern.type === `equals`) variant = `intermediary`
  else if (pattern.type === `is_element_of`) {
    if (openerAndCloserAreTheSame(pattern) && value === pattern.superset[0]) variant = `opener-and-closer`
    else if (value === pattern.superset[0]) variant = `opener`
    else if (value === pattern.superset[1]) variant = `closer`
  }

  assert(!isNil(variant), `Unknown variant for wrapper separator token`)

  return { value, variant }
}

// #region Basic Enclosures

export const LIST = new Type(`enclosure`, `list`, `L`).addSyntactical(ENCLOSURE_PRIORITY + 56, Infinity) // list of "nodes", has no lexical equivalent

export const PARENTHESIS = new Type(`enclosure`, `parenthesis`, `ρ`, [`wrapper`, `context:break`])
  .addLexical(ENCLOSURE_PRIORITY + 47, IS_ELEMENT_OF([`(`, `)`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const BRACES = new Type(`enclosure`, `braces`, `γ`, [`wrapper`, `context:break`])
  .addLexical(ENCLOSURE_PRIORITY + 46, IS_ELEMENT_OF([`{`, `}`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const BRACKETS = new Type(`enclosure`, `brackets`, `β`, [`wrapper`, `context:break`])
  .addLexical(ENCLOSURE_PRIORITY + 45, IS_ELEMENT_OF([`[`, `]`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const QUOTES = new Type(`enclosure`, `quotes`, `κ`, [`wrapper`, `context:break`])
  .addLexical(ENCLOSURE_PRIORITY + 44, IS_ELEMENT_OF([`"`, `"`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const PERCENTAGE = new Type(`enclosure`, `percentage`, `τ`, [`wrapper`, `context:break`])
  .addLexical(ENCLOSURE_PRIORITY + 43, IS_ELEMENT_OF([`%`, `%`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)

// #endregion

// #region Semantical Enclosures

export const FUNCTION = new Type(`enclosure`, `function`, `f`, [`context:break`])
  .addSemantical(ENCLOSURE_PRIORITY + 10)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(interleavedInOrder)

const CONDITION_CONDITION = new Type(`keyword`, `conditional:condition` as any, `ifC`)
  .addSemantical(KEYWORD_PRIORITY + 4) //
  .deriveSyntactical(1, { parent: TYPE.NAME(EQUALS(`conditional`)), pattern: TREE.IN_CONTEXT(TYPE.NAME(EQUALS(`conditional`))) })

const CONDITION_THEN = new Type(`keyword`, `conditional:then` as any, `ifT`)
  .addSemantical(KEYWORD_PRIORITY + 3)
  .deriveLexical(EQUALS(`then`, true))
  .deriveSyntactical(1, { parent: TYPE.NAME(EQUALS(`conditional`)), pattern: TREE.IN_CONTEXT(TYPE.NAME(EQUALS(`conditional`))) })

const CONDITION_ELSE = new Type(`keyword`, `conditional:else` as any, `ifE`)
  .addSemantical(KEYWORD_PRIORITY + 2)
  .deriveLexical(EQUALS(`else`, true))
  .deriveSyntactical(1, { parent: TYPE.NAME(EQUALS(`conditional`)), pattern: TREE.IN_CONTEXT(TYPE.NAME(EQUALS(`conditional`))) })

export const CONDITIONAL = new Type(`enclosure`, `conditional`, `if`, [`context:break`])
  .addSyntactical(ENCLOSURE_PRIORITY + 20, 3)
  .setInOrderBehaviour(interleavedInOrder)
  .deriveSemantical(
    new RuleSet(`conditional`).addGrammar(CONDITION_CONDITION, CONDITION_THEN, CONDITION_ELSE).add(
      `compose-conditional`,
      flow(
        match(TYPE.NAME(EQUALS(`function`))), // fn
        firstChild,
        match(NODE.CONTENT(IS_ELEMENT_OF([`if`, `@if`, `$if`]))), // firstChild === "if"
      ),
      (node, state, { grammar }) => {
        node.setType(CONDITIONAL)

        // pass "if" as a token, not as name (if don't have first child as name)
        const ifNode = node.children.remove(0, { refreshIndexing: false })
        const openerParenthesis = node.tokens[0]

        assert(ifNode.tokens.length === 1, `Conditional "IF" should be a single token`)

        const _if = ifNode.tokens[0]
        _if.attributes.traversalIndex = 0
        node.addToken(_if, 0)

        const start = node.children.nodes[0].range.column(`first`)
        const end = last(node.children.nodes)!.range.column(`last`)
        const _range = Range.fromInterval(start, end)

        const tokensByChild = node.children.map(child => [child, child.tokenize()] as const)
        const _tokensByChild = tokensByChild.map(([child, tokens]) => child.name)

        node.children.removeAll({ refreshIndexing: false })

        // add condition keyword (since first children of a conditional node is a condition group)
        const condition = node.LIST(Range.fromPoint(openerParenthesis.interval.end + 1))
        condition.setType(KEYWORD_GROUP)
        condition.setAttributes({ group: `condition` })

        node.children.add(condition, undefined, { refreshIndexing: false })

        let current = condition

        // global.__DEBUG = true // COMMENT

        // basically re-parse tokens
        for (const [child, tokens] of tokensByChild) {
          if (child.type.name === `string_collection`) debugger
          if (child.type.name === `sign`) debugger

          for (const { node: originalNode, token } of tokens) {
            let node: Node

            if (!token) node = originalNode.clone({ cloneSubTree: true })
            else {
              // re-match token in grammar (since grammar could have new shit)
              const types = grammar.syntacticalMatch(token.lexeme, current)
              assert(types.length > 0, `How can it be?`)

              // if prioritary type differs, clone token and update type
              const newType = types[0].name !== token.type.name
              const _token = newType ? token.clone().setType(types[0]) : token

              node = new Node(_token)
            }

            current = new SubTree(current).insert(node, { refreshIndexing: false })
          }
        }

        return node
      },
    ),
  )
  .addReduce(
    (node, { master }) => CUSTOM(),
    function (instruction, node, { master }) {
      assert(node.type.syntactical!.arity === 3, `Conditional requires three operands`)

      const [_condition, _consequent, _alternative] = node.children.nodes

      // verify conditional keywords (TODO: move this to semantic)
      assert(_consequent.type.name === `keyword_group`, `Consequent must be a keyword_group`)
      assert(_alternative.type.name === `keyword_group`, `Alternative must be a keyword_group`)

      let condition = this._processNode(_condition) as boolean | Node
      let consequent = this._processNode(_consequent)
      let alternative = this._processNode(_alternative)

      // just wrap consequent and alternative into nodes and assign as children of if
      if (condition instanceof Node) {
        if (!(consequent instanceof Node)) {
          _consequent.children.removeAll()

          const type = getType(typing.getType(consequent)!)
          consequent = Node.fromToken(consequent.toString(), type)
          _consequent.syntactical.addNode(consequent)
        }

        if (!(alternative instanceof Node)) {
          _alternative.children.removeAll()

          const type = getType(typing.getType(alternative)!)
          alternative = Node.fromToken(alternative.toString(), type)
          _alternative.syntactical.addNode(alternative)
        }

        return node
      }

      return condition ? consequent : alternative
    },
  )

// TODO: Add resolver rule to conditional (algorithim to "resolve" node into a value)

// #endregion

// WARN: Always update this list when adding a new recipe
export const SEMANTICAL_ENCLOSURES = [FUNCTION, CONDITIONAL]
export const SEMANTICAL_ENCLOSURES_NAMES = [`function`, `conditional`] as const
export type SemanticalEnclosureTypeName = (typeof SEMANTICAL_ENCLOSURES_NAMES)[number]

export const ENCLOSURES = [LIST, PARENTHESIS, BRACES, BRACKETS, QUOTES, PERCENTAGE, ...SEMANTICAL_ENCLOSURES]
export const ENCLOSURE_NAMES = [`list`, `parenthesis`, `braces`, `brackets`, `quotes`, `percentage`, ...SEMANTICAL_ENCLOSURES_NAMES] as const
export type EnclosureTypeName = (typeof ENCLOSURE_NAMES)[number]

export const ENCLOSURES_BY_NAME = ENCLOSURES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
