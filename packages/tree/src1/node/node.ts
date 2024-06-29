import { isEmpty, isNil } from "lodash"

import type Tree from "../tree"

import { NodeState } from "./state"

import { numberToLetters } from "../utils"
import churchill, { paint } from "../logger"

export interface UnbalancedNode {
  index: number
  syntax: string
}

export default class Node {
  __node = true
  tree!: Tree

  state: NodeState = `crude`

  // #region Parent
  __parent: Node | null = null

  get parent(): Node | null {
    return this.__parent
  }

  set parent(value: Node | null) {
    if (value) {
      // on setting parent, also set tree
      if (isNil(value.tree)) debugger
      this.tree = value.tree
    }

    this.__parent = value
  }
  // #endregion

  id: number // root = -1
  value: string | null

  unbalanced: UnbalancedNode[] = []

  // #region Children

  // all children of this node, even "structural" ones
  __children: Node[] = []

  /** Returns only non-structural children */
  get children() {
    return this.__children
  }

  // #endregion

  isRoot() {
    return this.id === -1
  }

  // #region Getters

  get root() {
    return this.tree.root
  }

  get hasValue() {
    return this.value !== null
  }

  // #endregion

  // #region Aesthetics

  get color() {
    if (this.isRoot()) return paint.white

    const rest = this.id % 3
    if (rest === 2) return paint.magenta
    if (rest === 1) return paint.green
    else return paint.cyan
  }

  get backgroundColor() {
    if (this.isRoot()) return paint.bgWhite

    const rest = this.id % 3
    if (rest === 2) return paint.bgMagenta
    if (rest === 1) return paint.bgGreen
    else return paint.bgCyan
  }

  // #endregion

  constructor(id: number) {
    this.id = id

    this.value = null

    this.__children = []
    this.unbalanced = []
  }

  // #region Identification

  get level() {
    const parentLevel = (this.parent?.level ?? -1) as number
    return parentLevel + 1
  }

  get context() {
    if (this.id === -1) return `root`
    return `${this.level}${this.isRoot() ? `` : `.` + numberToLetters(this.id)}`
  }

  get path(): string {
    if (!this.parent) return ``
    const parentPath = this.parent.path
    if (isEmpty(parentPath)) return this.parent.id.toString()
    return `${parentPath}/${this.parent.id}`
  }

  get fullpath() {
    const path = this.path
    return `${path}${path === `` ? `root/` : `/`}${this.id}`
    // return `${path}${path === `` ? `` : `/`}${this.id}`
  }

  //    #endregion

  // #region Parentage

  _addChild(child: Node) {
    const thereIsAlreadyAChildWithThatID = this.__children.find(node => node.id === child.id)

    if (thereIsAlreadyAChildWithThatID) {
      if (this.tree.options.strictChildId) throw new Error(`Node ${child.context} (${child.value}) already exists as child of ${this.context}`)
      else {
        // if child id is not strict, just replace id with the next free one
        child.id = this.__children.length
      }
    }

    this.__children.push(child)

    child.parent = this
  }

  _removeChild(child: Node) {
    this.__children = this.__children.filter(node => node.id !== child.id)

    child.parent = null
  }

  addChild(...children: Node[]) {
    for (const child of children) this._addChild(child)
  }

  removeChild(...children: Node[]) {
    for (const child of children) this._removeChild(child)
  }

  ancestor(level: number): Node | null {
    if (this.level === level) return this

    if (!this.parent) return null

    return this.parent?.ancestor(level)
  }

  siblings(offsetSiblingIndex?: number) {
    if (!this.parent) return []

    if (offsetSiblingIndex === undefined) return this.parent.children.filter(node => node.id !== this.id)

    if (offsetSiblingIndex === 0) throw new Error(`0th sibling is itself`)

    if (!this.parent) debugger

    const selfIndex = this.parent.children.findIndex(node => node.id === this.id)

    if (selfIndex + offsetSiblingIndex >= this.parent.children.length) return []

    for (let index = 0; index < this.parent.children.length; index++) {
      const relativeIndex = index - selfIndex
      const sibling = this.parent.children[index]
      if (sibling.id === this.id) continue

      if (relativeIndex === offsetSiblingIndex) return [sibling]
    }

    // ERROR: Sibling not found. Should not be possible
    debugger
    return []
  }

  descendants(targetLevel: number): Node[] {
    if (this.level === targetLevel) return [this]

    const descendants = [] as Node[]

    for (const child of this.children) {
      descendants.push(...child.descendants(targetLevel))
    }

    return descendants
  }

  offset(levelOffset: number): Node[] {
    if (levelOffset < 0) {
      const ancestor = this.ancestor(this.level + levelOffset)

      return ancestor === null ? [] : [ancestor]
    }

    if (levelOffset >= 1) {
      const descendants = this.descendants(this.level + levelOffset)

      debugger
      return descendants
    }

    debugger
    // if (levelOffset === 0)
    return this.siblings()
  }

  // #endregion

  // #region Utils

  _child(id: number) {
    const child = new Node(id)

    return child
  }

  child(id?: number) {
    // id will be its probable index  (not necessarily) inside children
    id = id === undefined ? this.children.length : id

    const child = this._child(id)
    this.addChild(child)

    return child
  }

  repr() {
    return this.value ?? ``
  }

  match(pattern: RegExp) {
    return this.repr().match(pattern)
  }

  findByContext(context: string) {
    if (this.context === context) return this

    for (const child of this.children) {
      const found = child.findByContext(context)
      if (found) return found
    }

    return null
  }

  filterByContext(partialContext: RegExp) {
    const nodes = [] as Node[]

    if (this.context.match(partialContext)) nodes.push(this)

    for (const child of this.children) nodes.push(...child.filterByContext(partialContext))

    return nodes
  }

  // #endregion

  close(value: string) {
    this.value = value

    return this
  }

  height() {
    let childrenHeight = 0
    if (this.children.length > 0) childrenHeight = Math.max(...this.children.map(node => node.height()))
    return 1 + childrenHeight
  }
}
