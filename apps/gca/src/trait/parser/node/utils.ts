/* eslint-disable no-debugger */
import { intersection, range } from "lodash"
import { SyntaxName } from "../syntax"
import INode from "./interface"
import { typing } from "@december/utils"
import chalk from "chalk"

export function removeWrapper(string: string) {
  return string.substring(1, string.length - 1)
}

export function hasOnlyborn(node: INode) {
  return node.children.length === 1
}

export function hasOnlybornAnd(node: INode, names: SyntaxName[]) {
  return hasOnlyborn(node) && names.includes(node.children[0].syntax.name)
}

export function isOnlyborn(nodes: INode[]) {
  return nodes.length === 1
}

export function isOnlybornAnd(nodes: INode[], names: SyntaxName[]) {
  return isOnlyborn(nodes) && names.includes(nodes[0].syntax.name)
}

export function areSyntaxes(nodes: INode[], names: SyntaxName[]) {
  return (
    intersection(
      nodes.map(node => node.syntax.name),
      names,
    ).length === nodes.length
  )
}

export function someAreSyntaxes(nodes: INode[], names: SyntaxName[]) {
  return (
    intersection(
      nodes.map(node => node.syntax.name),
      names,
    ).length > 0
  )
}

export function isSyntax(node: INode, names: SyntaxName[]) {
  return names.includes(node.syntax.name)
}

export function trimAndUnwrap(node: INode, names: SyntaxName[]) {
  const trimmed = node.substring.trim()

  // if node is not of an expected syntax, just trim substring
  if (!names.includes(node.syntax.name)) return trimmed

  // ERROR: Untested
  if (node.children.length !== 1) debugger

  // if node is of an expected syntax, recursivelly unwrap it
  const fewerNames = names.filter(name => name !== node.syntax.name)
  return trimAndUnwrap(node.children[0], fewerNames)
}

// eslint-disable-next-line no-control-regex
export const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
export function removeANSI(string: string) {
  return string.replace(ANSI, ``)
}

export const ALPHABET = [`a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `p`, `q`, `r`, `s`, `t`, `u`, `v`, `w`, `x`, `y`, `z`]

export function toName(j: number) {
  let i = j % ALPHABET.length
  const f = Math.floor(j / ALPHABET.length)

  return `${range(0, f)
    .map(() => ALPHABET[0])
    .join(``)}${ALPHABET[i]}`
}

export function splitOnRegexWithIndex(string: string, regex: RegExp) {
  let results = [],
    cnt = regex.global ? Infinity : 1,
    m,
    offset = 0

  while (cnt-- && (m = regex.exec(string))) {
    const slice = string.slice(offset, m.index)

    results.push({
      before: ``,
      after: m[0],
      index: offset,
      text: slice,
    })

    offset = m.index + m[0].length
  }

  const slice = string.slice(offset)
  if (slice.length > 0) {
    results.push({
      before: ``,
      after: ``,
      index: offset,
      text: slice,
    })
  }

  // backtgrack to fill "before"
  for (let i = 1; i < results.length; i++) {
    const before = results[i - 1].after
    results[i].before = before
  }

  return results
}

export function guessNodeType(node: INode): string | undefined {
  let type: string | undefined

  if (node.syntax.name === `nil`) {
    type = `nil`
  } else if (node.syntax.type === `string`) {
    const substring = node.substring
    type = typing.guessType(substring)
  } else {
    const childrenTypes = node.children.map(child => guessNodeType(child)).join(`, `)

    if (node.syntax.name === `list`) {
      type = `[${childrenTypes}]`
    } else {
      const syntax = (node.syntax.type as any) === node.syntax.name ? node.syntax.type : `${node.syntax.type}:${node.syntax.name}`
      type = `${syntax}<${childrenTypes}>`
    }
  }

  if (!type) return undefined

  if (node.syntax.name === `nil`) return chalk.grey.italic.bgBlack(type)
  else if (node.syntax.name === `quotes` || node.syntax.type === `string` || node.syntax.name === `comma` || node.syntax.name === `list`) return node.color.bgBlack(type)
  return node.backgroundColor(type)
}
