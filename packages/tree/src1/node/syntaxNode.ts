import { isString } from "lodash"
import Node from "./node"
import type { SyntaxName, SyntaxWithSymbol } from "../syntax/manager"
import type { SyntaxSymbol } from "../syntax/syntax"

export default class SyntaxNode extends Node {
  __syntaxNode = true

  // #region Syntax
  __syntax: string // syntax name, object to be recovered from SyntaxManager (wherever it is)
  __syntaxSymbolKey: SyntaxSymbol[`key`] | undefined // key identifying a specific symbol match for the syntax (optional)

  get syntax() {
    const syntax = this.tree.syntaxManager.get(this.__syntax as any)

    // ERROR: Cannot be
    if (!syntax) debugger

    return syntax
  }

  get syntaxSymbol() {
    return this.__syntaxSymbolKey
  }

  get __syntaticDefinition() {
    return `${this.syntax.type}:${this.__syntax}${this.__syntaxSymbolKey ? `:${this.__syntaxSymbolKey}` : ``}`
  }

  get prefix() {
    return this.syntax.prefix
  }

  getSyntaxSymbol() {
    return this.syntax.getSymbol(this.__syntaxSymbolKey!)
  }

  setSyntax(syntaxWithSymbol: SyntaxWithSymbol, symbol?: SyntaxSymbol[`key`]): this
  setSyntax(syntax: SyntaxName | string, symbol?: SyntaxSymbol[`key`]): this
  setSyntax(syntaxOrSyntaxWithSymbol: SyntaxName | string | SyntaxWithSymbol, symbol: SyntaxSymbol[`key`] | undefined = undefined): this {
    if (isString(syntaxOrSyntaxWithSymbol)) {
      this.__syntax = syntaxOrSyntaxWithSymbol
      this.__syntaxSymbolKey = symbol
    } else {
      if (!syntaxOrSyntaxWithSymbol) debugger
      this.__syntax = syntaxOrSyntaxWithSymbol.syntax.name
      this.__syntaxSymbolKey = syntaxOrSyntaxWithSymbol.symbol ?? symbol
    }

    return this
  }

  isSyntax(syntax: SyntaxName | RegExp | string, symbol?: string | RegExp) {
    let isSyntax = isString(syntax) ? this.__syntax === syntax : !!this.__syntax.match(syntax)

    let isSymbol = symbol === undefined ? true : isString(symbol) ? this.__syntaxSymbolKey === symbol : !!this.__syntaxSymbolKey?.match(symbol)

    return isSyntax && isSymbol
  }

  isDeepSyntax(syntax: SyntaxName, { ignoreSyntaxes, childrenPass, ignoreEmpty }: Partial<{ ignoreEmpty: boolean; ignoreSyntaxes: SyntaxName[]; childrenPass: `all` | `some` }> = {}) {
    const doIgnore = ignoreSyntaxes?.includes(this.syntax.name as SyntaxName)
    if (doIgnore) {
      const children = this.children as SyntaxNode[]
      const nonEmptyChildren = ignoreEmpty ? children.filter(child => !/ */.test(child.repr())) : children

      const areChildren = nonEmptyChildren.map(child => child.isDeepSyntax(syntax, { ignoreSyntaxes, childrenPass }))

      if (childrenPass === `some`) return areChildren.some(Boolean)
      // default "all"
      else return areChildren.every(Boolean)
    }

    return this.isSyntax(syntax)
  }

  isDeepPrimitive() {
    if (this.syntax.name !== `list` && this.syntax.type === `primitive`) return true

    const children = this.children as SyntaxNode[]

    if (this.isSyntax(`function`, `name`) || this.isSyntax(`eval`, `name`)) debugger

    if (this.syntax.type === `enclosure` || this.syntax.name === `list`) return children.every(child => child.isDeepPrimitive())
    // else if () return true

    return false
  }

  // #endregion

  get context() {
    if (this.isRoot()) return super.context
    else return `${this.prefix}${super.context}`
  }

  constructor(id: number, syntax: SyntaxName | string, symbol: SyntaxSymbol[`key`] | undefined = undefined) {
    super(id)

    this.setSyntax(syntax, symbol)
  }

  // #region Parentage

  addChild(...children: (SyntaxNode | Node)[]) {
    super.addChild(...children)
  }

  removeChild(...children: (SyntaxNode | Node)[]) {
    super.removeChild(...children)
  }

  // #endregion

  // #region Utils

  _child(id: number) {
    const child = new SyntaxNode(id, `unknown`)

    return child
  }

  child(id?: number) {
    return super.child(id) as SyntaxNode
  }

  /** returns a string representation of a node (actually a sequence of tokens) */
  _repr(): NodeRepr[] {
    // TODO: Make printer _repr and SyntaxNode _repr the same function
    const childrenClusters = this.children.map((child: SyntaxNode) => child._repr())

    // flatten offspring nodes
    const tokens = [] as NodeRepr[]

    if (this.children.length === 0) return [{ node: this, fn: `value` }]
    else if (this.syntax.name === `list` || this.syntax.name === `root` || this.syntax.type === `pattern`) {
      tokens.push(...childrenClusters.flat())
    } else if (this.syntax.type === `enclosure`) {
      tokens.push({ node: this, fn: `opener` })
      tokens.push(...childrenClusters.flat())
      tokens.push({ node: this, fn: `closer` })
    } else if (this.syntax.type === `separator`) {
      tokens.push(...childrenClusters[0]!)
      for (let i = 1; i < childrenClusters.length; i++) {
        const children = childrenClusters[i]

        tokens.push({ node: this, fn: `value` })
        tokens.push(...children)
      }
    } else {
      // ERROR: Syntax not implemented
      debugger
    }

    return tokens
  }

  repr(): string {
    const tokens = [] as string[]

    const _repr = this._repr()
    for (const { node, fn } of _repr) {
      if (fn === `opener` || fn === `closer`) {
        const syntax = node.syntax as any
        tokens.push(syntax[fn])
      } else if (fn === `value`) tokens.push(node.value!)
      else {
        // ERROR: Repr function not implemented
        debugger
      }
    }

    return tokens.join(``)
  }

  filterBySyntax(syntax: SyntaxName, symbol: string | null = null) {
    const nodes = [] as SyntaxNode[]

    if (this.syntax.name === syntax && (symbol === null || this.syntaxSymbol === symbol)) nodes.push(this)

    for (const child of this.children as SyntaxNode[]) nodes.push(...child.filterBySyntax(syntax, symbol))

    return nodes
  }

  // #endregion

  groupChildrenBySyntaxSymbol(syntax: SyntaxName | string) {
    const nodes = {} as Record<string, SyntaxNode[]>

    for (const child of this.children as SyntaxNode[]) {
      if (child.syntax.name !== syntax) continue

      const symbol = child.syntaxSymbol!

      if (!nodes[symbol]) nodes[symbol] = []
      nodes[symbol].push(child)
    }

    return nodes
  }
}

export interface NodeRepr {
  node: SyntaxNode
  fn: `value` | `opener` | `closer`
}
