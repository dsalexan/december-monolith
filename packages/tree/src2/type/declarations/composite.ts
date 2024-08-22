import assert from "assert"
import Type, { isOperand } from "../base"
import { Match, Range } from "@december/utils"
import Node, { Search } from "../../node"
import { isNil, range } from "lodash"
import { OriginalChildrenTracking } from "../rules/semantical"
import { IDENTIFIER } from "./identifier"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const COMPOSITE_PRIORITY = 10000

export const FUNCTION = new Type(`composite`, `function`, `f`)
  .addSemantical(
    COMPOSITE_PRIORITY + 10,
    (parent, children) => {
      const string = Search.find(children, node => node.type.name === `string`) // 1. find literal
      const parenthesis = Search.next(children, string) // 2. find parenthesis right next

      return children[parenthesis!]?.type?.name === `parenthesis` ? { string, parenthesis } : false
    },
    (parent, children, match: { string: number; parenthesis: number }, tracking: OriginalChildrenTracking) => {
      const string = children[match.string]
      const parenthesis = children[match.parenthesis]

      const fallbackRange = Range.fromOffsetPoints([string.range.column(`first`), parenthesis.range.column(`last`)], 0.5)
      const fn: Node = new Node(FUNCTION, fallbackRange)

      fn.setAttributes({ originalNodes: [string, parenthesis], reorganized: true })

      string
        ._addToParent(fn, null, true)
        .setAttributes({ tags: [`name`] })
        .setType(IDENTIFIER)

      // all arguments of a function are its [1, N] children (there is no seed for a parenthesis)
      // parenthesis._addToParent(fn, null, true).setAttributes({ tags: [`arguments`] })
      assert(parenthesis.tokens.length === 2, `Unimplemented for enclosure with anything but 2 tokens`)

      // properly format tokens (for traversal)
      const [opener, closer] = parenthesis.tokens
      opener.attributes.traversalIndex = 1
      closer.attributes.traversalIndex = -1

      fn.addToken([opener, closer])

      assert(parenthesis.children.length <= 1, `Unimplemented for enclosure with multiple children`)

      if (parenthesis.children.length === 1) {
        const child = parenthesis.children[0]

        if (isOperand(child.type.id)) child._addToParent(fn, null, true).setAttributes({ tags: [`argument`] })
        else if (child.type.name === `comma`) {
          // inject comma tokens
          const commas = child.tokens
          for (const [i, comma] of commas.entries()) comma.attributes.traversalIndex = i + 1
          fn.addToken(commas)

          const grandchildren = [...child.children]
          for (const grandchild of grandchildren) grandchild._addToParent(fn, null, true).setAttributes({ tags: [`argument`] })
        } else debugger
      }

      const newChildren = [fn]

      // update tracking
      tracking.update(string, `reorganized`)
      tracking.update(parenthesis, `reorganized`)

      for (const i in range(0, match.string)) tracking.update(children[i], `pass-through`)
      for (const i in range(match.parenthesis + 1)) tracking.update(children[i], `pass-through`)

      // fill remaining nodes
      newChildren.unshift(...children.slice(0, match.string))
      newChildren.push(...children.slice(match.parenthesis + 1))

      return newChildren
    },
  )
  .deriveSyntactical(Infinity)

// WARN: Always update this list when adding a new recipe
export const COMPOSITES = [FUNCTION]
export const COMPOSITE_NAMES = [`function`] as const
export type CompositeTypeName = (typeof COMPOSITE_NAMES)[number]

export const COMPOSITES_BY_NAME = COMPOSITES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
