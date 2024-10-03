import { isEmpty, isNil } from "lodash"
import { preOrder } from "../traversal"
import { Node } from "./base"
import { NodeTokenizedWord_Node } from "./token"

export function toString(this: Node) {
  const _tags = this.attributes.tags.length ? ` [${this.attributes.tags.join(`,`)}]` : ``
  return `${this.name}${_tags}`
}

export function repr(this: Node) {
  const tokenized = this.tokenize() as NodeTokenizedWord_Node[]
  const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))

  const string = allTokens.map(token => token.lexeme).join(``)

  return string
}

export function debug(this: Node) {
  console.log(`======================================`)
  console.log(`                DEBUG `)
  console.log(` ${this.name} `)
  console.log(` ${this.id} `)
  console.log(`======================================`)
  console.log(`\n`)

  preOrder(this, node => {
    const lexeme = node.getDebugContent()

    let interval = `<interval>`
    try {
      interval = node.tokens.length > 0 ? node.tokens.map(token => token.interval.toString()).join(`; `) : `—`
    } catch {
      //
    }

    let range = `<range>`
    try {
      range = node.range.toString()
    } catch {
      //
    }

    console.log(`${` `.repeat(node.level * 2)}${node.name} ${!isNil(lexeme) && !isEmpty(lexeme) ? `<${lexeme}>` : ``}  ${interval}  =>  ${range}`)
  })
}
