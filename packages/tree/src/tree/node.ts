import { Nullable } from "tsdef"

import uuid from "@december/utils/uuid"
import { numberToLetters } from "@december/utils"

import { NODE_TYPE_PREFIX, NodeType } from "./type"
import { Block } from "../logger"
import { print } from "./printer"
import { isNil } from "lodash"

export interface NodeOptions {}

export class Node {
  public id: string = uuid()
  public type: NodeType

  constructor() {}

  static isNode(node: any): node is Node {
    return node instanceof Node
  }

  // #region PARENT/CHILDREN

  public parent: Nullable<Node> = null
  public index: Nullable<number> = null
  public label: Nullable<string> = null
  public children: Node[] = []

  public setParent(parent: Node, index: number, label: string) {
    this.parent = parent
    this.index = index
    this.label = label
  }

  public addChild(child: Node, index: number, label: string) {
    this.children.splice(index, 0, child)
    child.setParent(this, index, label)
  }

  // #endregion

  // #region TREE
  public get level() {
    return this.parent ? this.parent.level + 1 : 0
  }

  public get letter() {
    return !isNil(this.index) ? numberToLetters(this.index) : ``
  }

  public get letters() {
    return this.parent ? this.parent.letters + this.letter : this.letter
  }

  public get name() {
    const prefix = NODE_TYPE_PREFIX[this.type]
    const letters = this.parent ? `.` + this.letters : ``
    return `${prefix}${this.level}${letters}`
  }

  // #endregion

  // #region DEBUG

  public print() {
    return print(this)
  }

  public toBlocks(): Block[] {
    throw new Error(`Method not implemented for type "${this.type}".`)
  }

  public getDebug(): string {
    return `<${this.name}>`
  }

  public getContent(): string {
    throw new Error(`Method not implemented for type "${this.type}".`)
  }

  // #endregion
}
