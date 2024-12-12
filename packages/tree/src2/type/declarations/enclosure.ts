import assert from "assert"
import { isNil, last } from "lodash"
import { flow } from "fp-ts/lib/function"

import { Match, Range, typing } from "@december/utils"
import { BasePattern } from "@december/utils/match/base"
import { EQUALS, IS_ELEMENT_OF, IsElementOfSetPattern } from "@december/utils/match/element"
import { AND, OR } from "@december/utils/match/logical"
// import { CONTAINED_IN, ContainedInSetPattern } from "@december/utils/match/set"

import Type from "../base"
import Node, { NodeFactory, SubTree } from "../../node"
import type Token from "../../token"
import { getType } from "../../type"
import { EvaluatorOptions } from "../../phases/lexer/evaluation"
import { interleavedInOrder, wrapperInOrder } from "../../node/traversal"

import { RuleSet, Rule } from "../../nrs"
import { leftOperand, match, matchInChildren, nextSibling, predicate, filter, firstChild } from "../../nrs/rule/match/functions"
import { ADD_NODE_AT, COLLAPSE_NODE, REMOVE_NODE, SWAP_NODES_AT } from "../../nrs/rule/mutation/instruction"

import { TYPE, NODE, TREE } from "../../match/pattern"
import { KEYWORD_GROUP } from "./keyword"
import { CUSTOM } from "../../phases/reducer/instruction"
import { NodeTokenizedWord_Node } from "../../node/node/token"
import Parser from "../../phases/parser"

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
        // 1. An IF initially would be considered a function make it its own type
        node.setType(CONDITIONAL)

        // 2. Incorporate if as a token (currently it is the node "name" for function)
        const ifNode = node.children.remove(0, { refreshIndexing: false })
        assert(ifNode.tokens.length === 1, `Conditional "IF" should be a single token`) // cant handle

        const _if = ifNode.tokens[0]
        _if.attributes.traversalIndex = 0
        node.addToken(_if, 0)

        // 2.A. Update "(" traversal index to follow IF
        node.tokens[1].attributes.traversalIndex = 0

        // 3. Remove all children from node (IF), but keep tokens for re-parsing
        const tokensByChild = node.children.map(child => [child, child.tokenize() as NodeTokenizedWord_Node[]] as const)
        const tokens = tokensByChild.map(([, tokens]) => tokens).flat()
        node.children.removeAll({ refreshIndexing: false })

        // 4. Append empty CONDITIONAL keyword group (since they can't be parsed automatically)
        const condition = NodeFactory.abstract.LIST(Range.fromPoint(node.tokens[1].interval.end + 1)) // start AFTER opener parenthesis
        condition.setType(KEYWORD_GROUP)
        condition.setAttributes({ group: `condition` })

        node.children.add(condition, undefined, { refreshIndexing: false })

        // 5. Re-parse offpsing tokens from IF node (previously inside functions arguments)
        Parser.processTokenizedWords(tokens, { grammar, initialSubTreeRoot: condition, debug: false })

        return node
      },
    ),
  )
  .addReduce(
    (node, { master }) => CUSTOM(),
    function (instruction, node, { master }) {
      const dontReduce = this.options.ignoreTypes?.includes(node.type.name)

      assert(node.type.syntactical!.arity === 3, `Conditional requires three operands`)

      const [_condition, _consequent, _alternative] = node.children.nodes

      // verify conditional keywords (TODO: move this to semantic)
      assert(_consequent.type.name === `keyword_group`, `Consequent must be a keyword_group`)
      assert(_alternative.type.name === `keyword_group`, `Alternative must be a keyword_group`)

      let condition = this._processNode(_condition) as boolean | Node
      let consequent = this._processNode(_consequent)
      let alternative = this._processNode(_alternative)

      if (dontReduce && !(condition instanceof Node)) {
        _condition.children.removeAll()

        // const type = getType(typing.getType(condition)!)
        // condition = NodeFactory.abstract.make(condition.toString(), type)
        const conditionNode = NodeFactory.abstract.makeByGuess(condition)
        condition = conditionNode
        _condition.syntactical.addNode(condition)
      }

      // just wrap consequent and alternative into nodes and assign as children of if
      if (condition instanceof Node) {
        if (!(consequent instanceof Node)) {
          _consequent.children.removeAll()

          // const type = getType(typing.getType(consequent)!)
          // consequent = NodeFactory.abstract.make(consequent.toString(), type)
          const consequentNode = NodeFactory.abstract.makeByGuess(consequent)
          consequent = consequentNode
          _consequent.syntactical.addNode(consequent)
        }

        if (!(alternative instanceof Node)) {
          _alternative.children.removeAll()

          // const type = getType(typing.getType(alternative)!)
          // alternative = NodeFactory.abstract.make(alternative.toString(), type)
          const alternativeNode = NodeFactory.abstract.makeByGuess(alternative)
          alternative = alternativeNode
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
