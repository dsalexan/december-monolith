/* eslint-disable no-debugger */
import chalk from "chalk"
import { Node } from "."
import { TraitParser } from ".."
import { SYNTAX_COMPONENTS, SyntaxComponent } from "../syntax"
import INode from "./interface"
import { isString, orderBy, range } from "lodash"
import { LOGIC_FUNCTION_NAMES, LOGIC_RECOGNIZED_FUNCTION_INDEX } from "../syntax/logic"
import { AggregatorSyntaxComponent } from "../syntax/types"
import { FUNCTION_LIKE_PRIORITY } from "../syntax/functionLike"

export function advance(carry: INode, to?: number) {
  // ERROR: Cannot advance backwards dude
  if (to! < carry.start) debugger

  if (to === undefined) to = (carry.end ?? carry.start) + 1

  carry.end = to

  /**
   * When a carrier node (usually string only) is advanced there is a chance the node is broken into 2+ nodes.
   * This is a device to parse WORDS as syntatic components, not just characters.
   *
   * To keep my sanity I will only support this behaviour here, in this class (there are 2k+ lines in the main node class already).
   *
   * Since, on breaking, all nodes involved will be added as children of parent node in the original order of characters, NOTHING should change for the main class.
   * I hope.
   */

  const parent = carry.parent
  const grandparent = parent?.parent

  const content = carry.substring

  // let RECOGNIZED_FUNCTION_NAMES = [...DIRECTIVE_FUNCTION_NAMES]
  // if (grandparent?.syntax.name === `math_function`) RECOGNIZED_FUNCTION_NAMES.push(...LOGIC_FUNCTION_NAMES)

  // RECOGNIZED_FUNCTION_NAMES = orderBy(RECOGNIZED_FUNCTION_NAMES, ({ syntax }) => FUNCTION_LIKE_PRIORITY[syntax.name] ?? 0, `desc`)

  // // FUNCTION-LIKE
  // for (const { functionNames: patterns, syntax } of RECOGNIZED_FUNCTION_NAMES) {
  //   // get function name (sometimes just carry substring, other its first leave of grandparent)
  //   let functionName = content
  //   if (syntax.grandparents.includes(`math_function`)) functionName = grandparent!.children[0].substring.trim()

  //   //    faster discard (directive MUST includes a #)
  //   if (syntax.name === `directive` && !functionName.includes(`#`)) continue

  //   if (syntax.grandparents.includes(`math_function`)) debugger
  //   debugger

  //   const matches = patterns.map(pattern => {
  //     if (isString(pattern)) return pattern === functionName ? [functionName, functionName] : null
  //     return functionName.match(pattern)
  //   })
  //   const match = matches.find(match => !!match)
  //   if (!match) continue

  //   // break last N characters from carry into new node
  //   breakaway(carry, match[1].length, syntax)

  //   parent?.tree()

  //   debugger

  //   // inform resolver that this carry node is DONE, and whatever new string is found should be added to a new one
  //   return null
  // }

  if (grandparent?.syntax.name === `math_function`) {
    // LOGIC

    // carry.header(`${chalk.italic.dim(`'`)}${chalk.bold(content)}${chalk.italic.dim(`'`)} ${chalk.italic(`(${grandparent?.context ?? `⌀`} > ${parent?.context})`)}`)
    // carry.tree()

    const patterns = [] as RegExp[]

    const marker = grandparent?.children[0].substring
    const name = grandparent?.children[1].substring
    const functionName = `${marker}${name}`
    const syntaxName = LOGIC_RECOGNIZED_FUNCTION_INDEX[functionName]
    const syntax = SYNTAX_COMPONENTS[syntaxName] as AggregatorSyntaxComponent

    // if functionName is recognized
    if (syntax) {
      patterns.push(...syntax.patterns)

      // if some of the patterns are found in substring
      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (!match) continue

        // break last N characters from carry into new node
        breakaway(carry, match[1].length, syntax)

        // inform resolver that this carry node is DONE, and whatever new string is found should be added to a new one
        return null
      }
    }
  }

  return carry
}

function breakaway(carry: INode, length: number, syntax: SyntaxComponent) {
  const parent = carry.parent
  if (!parent) debugger // wtf

  let id = (carry.id as number) + 1

  // receed carry
  carry.end = carry.end! - length

  //    remove carry if necessary
  if (carry.end < carry.start) {
    carry.parent?.removeChild(carry)
    id--
  }

  // create new node
  const node = new Node(carry.parser, null, id, carry.end! + 1, syntax)
  node.end = node.start + length - 1
  node.middles = range(node.start, node.end + 1)

  // add new node as sibling of carry
  parent!.addChild(node)

  return node
}
