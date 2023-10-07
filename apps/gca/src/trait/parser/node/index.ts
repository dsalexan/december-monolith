import { isNilOrEmpty, push, typing } from "@december/utils"
import chalk from "chalk"
import { cloneDeep, first, groupBy, identity, intersection, isEmpty, isNil, isString, last, max, maxBy, min, orderBy, over, range, uniq, zip } from "lodash"

import churchill from "../../../logger"
import { TraitParser } from ".."
import { EnclosureSyntaxComponent, SYNTAX_COMPONENTS, SeparatorSyntaxComponent, SyntaxComponent, SyntaxName } from "../syntax"
import MathObject from "../syntax/math/object"
import INode, { ISerializedNode, NodeIssue, createNodeIssue } from "./interface"
import NodePrinter from "./printer"
import NodeResolver, { NodeResolveOptions } from "./resolver"
import { removeANSI, toName } from "./utils"
import LogBuilder from "@december/churchill/src/builder"

export const logger = churchill.child({ name: `node` })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Node<TSyntax extends SyntaxComponent = SyntaxComponent, TData extends object = any> implements INode {
  parser!: TraitParser
  printer: NodePrinter
  resolver: NodeResolver

  __parent: INode | null = null
  get parent() {
    return this.__parent
  }
  set parent(value: INode | null) {
    if (value) {
      // eslint-disable-next-line no-debugger
      if (isNil(value.parser)) debugger
      this.parser = value.parser
    }
    this.__parent = value
  }

  id: `root` | number
  start: number
  end: number | null
  middles: number[]

  syntax: TSyntax

  children: INode[] = []
  unbalanced: { index: number; syntax: SyntaxComponent }[] // list of occurences of unbalanced syntatic components

  data: TData

  constructor(parser: TraitParser, parent: INode | null, id: number | `root`, start: number, syntax: TSyntax, data?: TData) {
    this.parser = parser
    this.printer = new NodePrinter(this)
    this.resolver = new NodeResolver(this)

    this.parent = parent

    this.id = id

    this.start = start
    this.end = null

    // almost cosmetic, but useful for debugging
    this.middles = []

    this.children = []
    this.unbalanced = []

    this.syntax = syntax

    this.data = data ?? ({} as TData)
  }

  // #region getters

  // Returns end of node OR end of tree, when node is unbalanced
  get safe_end() {
    return this.end ?? this.parser.text.length
  }

  get substring() {
    return this.parser.text.substring(this.start, this.safe_end + 1)
  }

  // IDENTIFICATION

  get level() {
    const parentLevel = (this.parent?.level ?? -1) as number
    return parentLevel + 1
  }

  get context() {
    if (this.id === `root`) return `root`
    return `${this.syntax.prefix}${this.level}.${toName(this.id)}`
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

  // FLAGS
  get isUnbalanced() {
    return this.end === null
  }

  get isMathTree(): boolean {
    if (this.syntax.name === `math_expression`) return true
    if (this.parent) return this.parent.isMathTree

    return false
  }

  get isMathAllowed(): boolean {
    return this.isMathTree && !this.hasAncestor(`quotes`)
  }

  // AESTHETICS
  get color() {
    if (this.id === `root`) return chalk.white

    const rest = this.id % 3
    if (rest === 2) return chalk.magenta
    if (rest === 1) return chalk.green
    else return chalk.cyan
  }

  get backgroundColor() {
    if (this.id === `root`) return chalk.bgWhite

    const rest = this.id % 3
    if (rest === 2) return chalk.bgMagenta
    if (rest === 1) return chalk.bgGreen
    else return chalk.bgCyan
  }

  // #endregion

  // #region parentage

  _addChild(child: INode) {
    if (this.children.find(node => node.id === child.id)) {
      // throw new Error(`Node ${child.context} (${child.substring}) already exists as child of ${this.context}`)
      child.id = this.children.length
    }

    this.children.push(child)

    child.parent = this
  }

  _removeChild(child: INode) {
    this.children = this.children.filter(node => node.id !== child.id)

    child.parent = null
  }

  addChild(...children: INode[]) {
    for (const child of children) this._addChild(child)
  }

  removeChild(...children: INode[]) {
    for (const child of children) this._removeChild(child)
  }

  getLevels() {
    const list = [[this]] as INode[][]

    let newLeaves
    do {
      const leaves = list[list.length - 1]

      newLeaves = []
      for (const node of leaves) newLeaves.push(...node.children)

      list.push(newLeaves)
      // debugger
    } while (newLeaves.length > 0)

    list.pop()

    return list
  }

  get(context: string): INode | undefined {
    if (context === this.context) return this
    for (const child of this.children) {
      const getContext = child.get(context)
      if (getContext) return getContext
    }

    return undefined
  }

  find(syntax: SyntaxComponent | SyntaxName): INode | undefined {
    if (isString(syntax)) syntax = SYNTAX_COMPONENTS[syntax]
    if (this.syntax.name === syntax.name) return this

    for (const child of this.children) {
      const find = child.find(syntax)
      if (find) return find
    }

    return undefined
  }

  at(index: number): INode | undefined {
    // return node level by index of character
    if (index < this.start) return undefined
    if (index > this.safe_end) return undefined

    const character = this.parser.text[index]

    for (const child of this.children) {
      const start = child.start
      const end = child.safe_end

      if (index >= start && index <= end) return child.at(index)
    }

    return this
  }

  hasAncestor(...syntaxes: SyntaxName[]): boolean {
    if (!this.parent) return false
    if (syntaxes.includes(this.parent.syntax.name)) return true
    return this.parent.hasAncestor(...syntaxes)
  }

  getOffspring() {
    const offspring = [...this.children]

    for (const child of this.children) {
      offspring.push(...child.getOffspring())
    }

    return offspring
  }

  getLeaves() {
    const leaves = [] as INode[]

    for (const child of this.children) {
      if (child.children.length === 0) leaves.push(child)
      else leaves.push(...child.getLeaves())
    }

    return leaves
  }

  // #endregion

  // #region validation

  validate() {
    const issues = [] as NodeIssue[]

    issues.push(...this._validate())
    for (const child of this.children) {
      const { issues: childIssues } = child.validate()
      issues.push(...childIssues)
    }

    return { success: issues.length === 0, issues }
  }

  _validate() {
    const issues = [] as NodeIssue[]

    if (!this.parent && this.id !== `root`) issues.push(createNodeIssue(`parentless`, this, this.substring))
    // if (isNil(this.end)) issues.push(createNodeIssue(`unbalanced`, this, this.substring))

    return issues
  }

  tree(log?: LogBuilder): true {
    log = log ?? churchill.child({ name: `node` }).builder()

    this._tree(log)

    log.tab()
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]

      log.add(chalk.grey.italic(i))
      child.tree(log)
    }
    log.tab(-1)

    return true
  }

  _tree(log: LogBuilder) {
    const CAP = 200

    let substring = this.substring
    if (this.children.length > 0) {
      const passedCap = substring.length > CAP
      substring = substring.slice(0, passedCap ? CAP - 5 : substring.length)
      if (passedCap) substring = `${substring}${chalk.bgGray.italic(`[...]`)}`
    }

    log
      .add(this.backgroundColor(` ${this.context} `))
      .add(chalk.grey(`[${chalk.bold(this.start)} → ${chalk.bold(this.end)}]`))
      .add(chalk.white.bgBlack(substring))
      .debug()
  }

  header(text: string, log?: LogBuilder) {
    log = (log ?? churchill.child({ name: `node` })).builder({ separator: `` })

    const FULL_PAD = 50
    const PAD = FULL_PAD - removeANSI(text).length
    const halfPad = Math.ceil(PAD / 2)

    const padStart = ` `.repeat(halfPad)
    const padEnd = ` `.repeat(PAD - halfPad)
    const message = `${padStart}${text}${padEnd}`

    log.add(` `).debug()
    log.add(this.backgroundColor.white(message)).debug()
    log.add(` `).debug()
  }

  // #endregion

  // #region parsing

  resolve(options: Partial<NodeResolveOptions> = {}) {
    return this.resolver.resolve(options)
  }

  reorganize(options: Partial<NodeResolveOptions>) {
    return this.resolver.reorganize(options)
  }

  simplify() {
    return this.resolver.simplify()
  }

  rasterize(minStart: number, maxEnd: number) {
    this.resolver.rasterize(minStart, maxEnd)
  }

  normalize() {
    this.resolver.normalize()
  }

  resolveMath() {
    return this.resolver.resolveMath()
  }

  // #endregion

  // #region serialization

  serialize() {
    const object: ISerializedNode<TData> = {
      parent: this.parent?.fullpath ?? null,
      id: this.id,

      start: this.start,
      end: this.end,

      middles: this.middles,

      children: this.children.map(node => node.serialize()),
      unbalanced: this.unbalanced,

      syntax: this.syntax.name,

      data: {} as TData,
    }

    let data = this.data as TData

    object.data = data

    return object
  }

  static deserialize<TSyntax extends SyntaxComponent = SyntaxComponent, TData extends object = any>(serialized: ISerializedNode, parser: TraitParser) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data = serialized.data as any
    if (data.mathObject) data.mathObject = MathObject.deserialize(data.mathObject)

    const node = new Node<TSyntax, TData>(parser, null, serialized.id, serialized.start, SYNTAX_COMPONENTS[serialized.syntax] as TSyntax, data)
    node.end = serialized.end
    node.middles = serialized.middles

    node.unbalanced = serialized.unbalanced

    for (const serializedChild of serialized.children) {
      if (node.fullpath !== serializedChild.parent) {
        // ERROR: Node doesnt seem to be parent of child
        // eslint-disable-next-line no-debugger
        debugger
      }

      const child = Node.deserialize(serializedChild, parser)

      node.addChild(child)
    }

    return node
  }

  // #endregion
}
