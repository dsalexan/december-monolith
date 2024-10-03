import { cloneDeep, isString } from "lodash"

import { Range, Interval } from "@december/utils"

import Grammar from "../../type/grammar"
import Token from "../../token"
import Type from "../../type/base"
import { Node } from "./base"

import { NIL } from "../../type/declarations/literal"
import { LIST } from "../../type/declarations/enclosure"
import { ConcreteString, ProvidedString } from "../../string"

export interface NodeCloningOptions {
  registerOriginalNodes: boolean
  cloneSubTree: boolean
}

export function clone(this: Node, options: Partial<NodeCloningOptions> = {}) {
  // const node = new Node(this._type!, this._range ? this._range.clone() : this._range)
  let node: Node
  if (this._tokens.length > 0) node = new Node(this._tokens[0])
  else node = Node.tokenless(this._type!, this._range ? this._range.clone() : this._range)

  node.id = this.id
  node._tokens = this._tokens.map(token => token.clone())

  if (this._attributes) node._attributes = cloneDeep(this._attributes)
  if (this._type) node._type = this._type
  if (this._range) node._range = this._range.clone()

  if (options?.cloneSubTree) {
    for (const child of this.children.nodes) {
      const clone = child.clone(options)
      node.children.add(clone, null, { refreshIndexing: false })
    }
  }

  // node.refreshIndexing()

  return node
}

// export function createNil(this: Node, range?: Range) {
//   range ??= this.range
//   return new No1de(NIL, Range.fromPoint(range.column(`first`)))
// }

// export function createList(range: Range) {
//   return new N1ode(LIST, range)
// }

// export function createFromToken(stringOrToken: Token | ProvidedString | ConcreteString | string, type: Type) {
//   let token: Token
//   let nodeType: Type | undefined

//   if (stringOrToken instanceof Token) {
//     token = stringOrToken
//     nodeType = type
//   } else {
//     if (isString(stringOrToken)) stringOrToken = { type: `concrete`, value: stringOrToken }
//     token = new Token(stringOrToken, type)
//   }

//   const node = new Node(token)
//   if (nodeType) node.setType(nodeType)

//   return node
// }
