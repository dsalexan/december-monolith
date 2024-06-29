import chalk from "chalk"
import { TraitParser } from ".."
import { SyntaxComponent, SyntaxName } from "../syntax"
import NodePrinter from "./printer"
import NodeResolver, { NodeResolveOptions } from "./resolver"
import { Builder as LogBuilder } from "@december/logger"

export type NodeIssueType = `unbalanced` | `parentless`

export type NodeIssue = {
  type: NodeIssueType
  node: INode
  substring: string
}

export function createNodeIssue(type: NodeIssueType, node: INode, substring: string) {
  const issue: NodeIssue = {
    type,
    node,
    substring,
  }

  return issue
}

export type INodeParent = INode | null
export type INodeUnbalanced = { index: number; syntax: SyntaxComponent }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ISerializedNode<TData extends object = any> = {
  parent: string | null
  id: number | `root`

  start: number
  end: number | null

  middles: number[]

  children: ISerializedNode[]
  unbalanced: { index: number; syntax: SyntaxComponent }[]

  syntax: SyntaxName

  data: TData
}

export default interface INode<TSyntax extends SyntaxComponent = SyntaxComponent, TData extends object = any> {
  parser: TraitParser
  printer: NodePrinter
  resolver: NodeResolver

  __parent: INodeParent
  get parent(): INodeParent
  set parent(value: INodeParent)

  id: `root` | number
  start: number
  end: number | null
  middles: number[]

  syntax: TSyntax

  children: INode[]
  unbalanced: INodeUnbalanced[] // list of occurences of unbalanced syntatic components

  data: TData

  get safe_end(): number // Returns end of node OR end of tree, when node is unbalanced
  get substring(): string

  // identification
  get level(): number
  get context(): string
  get path(): string
  get fullpath(): string

  // flags
  get isUnbalanced(): boolean
  get isMathTree(): boolean
  get isMathAllowed(): boolean

  // aesthecis
  get color(): chalk.Chalk
  get backgroundColor(): chalk.Chalk

  // parentage
  addChild(...children: INode[]): void
  removeChild(...children: INode[]): void
  getLevels(): INode[][]
  get(context: string): INode | undefined
  find(syntax: SyntaxComponent | SyntaxName): INode | undefined
  at(index: number): INode | undefined // Returns leafest node at index
  hasAncestor(...syntaxes: SyntaxName[]): boolean
  getOffspring(): INode[]
  getLeaves(): INode[]

  // validation
  validate(): { success: boolean; issues: NodeIssue[] }
  tree(log?: LogBuilder): true
  header(text: string): void

  // serialization
  serialize(): ISerializedNode<TData>

  // parsing
  resolve(options: Partial<NodeResolveOptions>): boolean
  reorganize(options: Partial<NodeResolveOptions>): void
  simplify(): INode | false
  specialize(options: Partial<NodeResolveOptions>): INode | false
  rasterize(minStart: number, maxEnd: number): void
  normalize(): void

  resolveMath(): boolean
}
