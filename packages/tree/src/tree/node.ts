import { Nullable } from "tsdef"

import uuid from "@december/utils/uuid"
import { numberToLetters } from "@december/utils"

import { NODE_TYPE_PREFIX, NodeType } from "./type"
import { Block } from "../logger"
import { print } from "./printer"

export interface NodeOptions {}

export class Node {
  public id: string = uuid()
  public type: NodeType

  constructor() {}

  // #region PARENT/CHILDREN

  public parent: Nullable<Node>
  public index: Nullable<number>
  protected children: Node[]

  public setParent(parent: Node, index: number) {
    this.parent = parent
    this.index = index
  }

  public addChild(child: Node, index?: number) {
    if (!this.children) this.children = []

    index ??= this.children.length
    this.children.splice(index, 0, child)
    child.setParent(this, index)
  }

  // #endregion

  // #region TREE
  public get level() {
    return this.parent ? this.parent.level + 1 : 0
  }

  public get letter() {
    return this.index ? numberToLetters(this.index) : ``
  }

  public get letters() {
    return this.parent ? this.parent.letters + this.letter : ``
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

  // #endregion
}
