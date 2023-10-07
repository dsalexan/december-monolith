/* eslint-disable no-debugger */
import LogBuilder from "@december/churchill/src/builder"
import churchill from "../../../logger"

import { EnclosureSyntaxComponent, RECOGNIZED_FUNCTIONS, SYNTAX_COMPONENTS, SeparatorSyntaxComponent, SyntaxComponent, SyntaxName } from "../syntax"
import { MATH_SYNTAX_NAMES } from "../syntax/math/syntax"

import INode from "./interface"
import { isNil, last, max, maxBy, min, orderBy, range, uniq, zip } from "lodash"
import { advance } from "./carry"
import { Node } from "."
import { AggregatorSyntaxComponent, AsyntaticComponent } from "../syntax/types"
import { typing } from "@december/utils"
import { LOGIC_SYNTAX_NAMES } from "../syntax/logic"

const RESOLVE_DIRECTIVES = [`close`, `open`, `char_child`, `unbalanced`, `as_string`] as const
type ResolveDirective = (typeof RESOLVE_DIRECTIVES)[number]

type IndexedAndPrioritizedNode = { node: Node; index: number; priority: number }

export type NodeResolveOptions = {
  log: LogBuilder
  printLog: boolean
  //
  syntax: SyntaxName[]
  //
}

export type NodeResolveSetup = {
  log: LogBuilder
  //
  ADDITIONAL_SYNTAXES: SyntaxName[]
  SYNTAXES: SyntaxName[]
  SYNTAX_INDEX: Record<SyntaxName, SyntaxComponent>
  SYNTAX_FROM_CHARACTER: (index: number) => SyntaxComponent
}

export default class NodeResolver {
  node: INode

  SETUP!: NodeResolveSetup

  silent: boolean = true

  constructor(node: INode) {
    this.node = node
  }

  // #region PROXYING

  get parser() {
    return this.node.parser
  }

  // #endregion

  // #region UTILS

  _setup(options: Partial<NodeResolveOptions> = {}, dontSet = false) {
    let log = options.log ?? churchill.child({ name: `node` }).builder()

    const PRINT_LOG = options.printLog ?? false
    if (!PRINT_LOG) log = undefined as any

    const ADDITIONAL_SYNTAXES = options.syntax ?? []

    let bothSyntaxes = [...this.parser.baseSyntaxes, ...ADDITIONAL_SYNTAXES.map(name => SYNTAX_COMPONENTS[name])]

    // filter all some syntaxes in specific cases
    //    1 - Removing all math related syntaxes inside quotes
    if (this.node.hasAncestor(`quotes`)) bothSyntaxes = bothSyntaxes.filter(syntax => !MATH_SYNTAX_NAMES.includes(syntax.name as any))

    const SYNTAX_INDEX = Object.fromEntries(bothSyntaxes.map(syntax => [syntax.name, syntax])) as Record<SyntaxName, SyntaxComponent>
    const SYNTAXES = Object.keys(SYNTAX_INDEX) as SyntaxName[]

    const SETUP = {
      log,
      //
      ADDITIONAL_SYNTAXES,
      SYNTAXES,
      SYNTAX_INDEX,
      SYNTAX_FROM_CHARACTER: this.parser.getSyntaxFromCharacter(SYNTAXES),
    }

    if (!dontSet) this.SETUP = SETUP

    return SETUP
  }

  _new(start: number, syntax: SyntaxComponent, id?: number | `root`) {
    // id will be its probable (not necessaryly) index inside children
    id = id ?? this.node.children.length

    const node = new Node(this.parser, null, id, start, syntax) // new node starts at enclosure opener
    this.node.addChild(node)

    return node
  }

  _newAt(start: number, syntax: SyntaxComponent, at: number, id?: number | `root`) {
    // q gambiarra hein queridao

    const node = this._new(start, syntax, id)

    // remove newly created child from list of children
    this.node.children.splice(this.node.children.length - 1, 1)

    // alocate in correct position as children
    this.node.children.splice(at, 0, node)

    return node
  }

  _carry(index: number) {
    const children = this.node.children

    // first check if last child could be a carry string node
    const lastChild = last(children)!

    const isString = lastChild?.syntax.name === `string`
    const endsImmediatelyBefore = lastChild?.end === index - 1

    let node: INode
    if (isString && endsImmediatelyBefore) {
      //    if last child is a string AND ends immediately before this index

      // set it as carry string node
      node = children.pop()!
      this.node.addChild(node)
    } else {
      // if not, create a new carry string node
      node = this._new(index, SYNTAX_COMPONENTS[`string`])
    }

    return node
  }

  _nil(id: number | `root`, start: number) {
    const TEXT_LENGTH = this.parser.text.length

    const cappedStart = Math.max(0, start)

    const nil = new Node(this.parser, null, id, cappedStart, SYNTAX_COMPONENTS.nil)
    nil.end = Math.min(cappedStart + 1, TEXT_LENGTH - 1)

    return nil
  }

  _list(id: number, nodes: INode[]) {
    const list = new Node(this.parser, null, id, nodes[0].start, SYNTAX_COMPONENTS.list)
    list.end = last(nodes)!.end

    for (const node of nodes) list.addChild(node)

    return list
  }

  _unbalanced(node: Node | { index: number; syntax: SyntaxComponent }) {
    let index = (node as any).index

    if (node instanceof Node) {
      index = node.start

      // remove node from children
      this.node.removeChild(node)
    }

    // register unbalanced index inside node
    this.node.unbalanced.push({ index, syntax: node.syntax })
  }

  // #endregion

  // #region CORE

  canResolve(options: Partial<NodeResolveOptions> = {}) {
    // const SETUP = this._setup(options, true)

    if (isNil(this.node.start) || this.node.start === -1 || this.node.start === Infinity) throw new Error(`Invalid node start: ${this.node.start}`)

    return true
  }

  resolve(options: Partial<NodeResolveOptions> = {}): boolean {
    if (!this.canResolve(options)) return false

    const { log, SYNTAX_FROM_CHARACTER } = this._setup(options)

    if (log) log.add(`resolve`).verbose()

    // get substring from start (source is parser.text ALWAYS, since it is immutable)
    let substring = this.node.substring
    let start = this.node.start

    // advance one to account for enclosure opener (no need to parse the opener, since we already know the node is an enclosure)
    let i0 = 0
    if (this.node.syntax.type === `enclosure`) i0++

    // main loop
    let carryStringNode = null as INode | null // carry string node found
    for (let i = i0; i < substring.length; i++) {
      const index = start + i // index of character in tree.text
      const char = substring[i] // character in tree.text

      const syntax = SYNTAX_FROM_CHARACTER(index)

      const isRelevantCharacter = !isNil(syntax) // if it is not a relevant character for parsing

      let asString = !isRelevantCharacter // if it is not a relevant character for parsing, add to carry string node

      if (isRelevantCharacter) {
        // if is IS a relevant character, first check if carry has something.
        //    if carry has text then close it (basically clear variable for the next iteration, since the substring that is a string is finished and now we have a new one based on relevant character)
        if (carryStringNode && !isNil(carryStringNode.end)) carryStringNode = null

        // resolve syntatic component from character
        let directive = this._resolve(index, syntax)

        // depending on directive, do some shit
        //    first phase
        if (directive === `open`) {
          const node = this._new(index, syntax)
          // if it is just OPEN, then a resolve for that new one is necessary
          node.resolve(options)

          // if node is NOT unbalanced
          if (!node.isUnbalanced) i += node.end! - index // node is OK, advance cursor to its end to continue parsing
          else {
            // remove node from children
            this.node.removeChild(node)

            directive = `unbalanced`
          }
        } else if (directive === `char_child`) {
          // consider current character as a node on its on
          const node = this._new(index, syntax)
          node.end = index
          node.middles = [index]
        }

        //    second phase
        if (directive === `close`) {
          this.node.end = index
          break
        } else if (directive === `unbalanced`) {
          this._unbalanced({ index, syntax }) // deal with unbalanced character

          directive = `as_string` // since it is not truly a relevant character, consider it a string
        }

        //    third phase
        if (directive === `as_string`) asString = true

        // ERROR: Directive not implemented (debug breakpoint cmon)
        if (![`close`, `open`, `char_child`, `unbalanced`, `as_string`].includes(directive)) debugger
      }

      // if character is to be considered a string (regardless of being relevant or not)
      if (asString) {
        // da seu jeito de achar um carry string node, faz um se necessário
        if (carryStringNode === null) carryStringNode = this._carry(index)

        // add character to carry string node
        carryStringNode = advance(carryStringNode, index)
      }
    }

    // VALIDATION
    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    // after resolving each character in substring, reorganize
    this.reorganize(options)

    return true
  }

  reorganize(options: Partial<NodeResolveOptions>) {
    // prioritize children of node
    const prioritary = this._prioritize(this.node.children)
    if (isNil(prioritary)) return false

    // REORGANIZE NODES
    this._reorganize(prioritary, options)

    // VALIDATION
    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    // reorganize again for lesser priorities
    // if (prioritary.lesser.length > 0)
    this.reorganize(options)

    return true // since SOMETHING was reorganized
  }

  simplify() {
    // first simplify children
    this._simplify_children()

    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    const originalRange = [this.node.start, this.node.end!]

    const isMathAllowed = this.node.isMathAllowed

    // simplify thyself
    if (this.node.syntax.name === `list` && this.node.children.length === 1) return this.node.children[0]

    if (isMathAllowed) {
      if (this.node.syntax.name === `list` || (this.node.syntax.type === `separator` && !this.node.syntax.name.startsWith(`math_`))) {
        const offspring = this.node.getOffspring()
        const syntaxes = uniq(offspring.map(node => node.syntax.name))

        if (syntaxes.every(syntax => [`string`, `parenthesis`, `math_variable`, `math_number`].includes(syntax))) {
          // make list/separator a flat math_variable

          this.node.syntax = SYNTAX_COMPONENTS.math_variable
          this.node.children = []
        }
      } else if (this.node.syntax.type === `string`) {
        const substring = this.node.substring

        const isEmpty = substring.match(/^ +$/g)
        const isFunctionName = this.node.parent?.syntax.name === `math_function`

        if (!isEmpty && !isFunctionName) {
          const type = typing.guessType(substring)

          if (type === `number`) this.node.syntax = SYNTAX_COMPONENTS.math_number
          else this.node.syntax = SYNTAX_COMPONENTS.math_variable
        }
      } else if (this.node.syntax.name === `quotes`) {
        this.node.syntax = SYNTAX_COMPONENTS.math_variable
        this.node.children = []
      }
    }

    // ERROR: Rasterization SHOULD NOT be necessary here (i.e. start/end should not change)
    if (this.node.start !== originalRange[0] || this.node.end !== originalRange[1]) debugger

    return false
  }

  /**
   * Reset node's start and end, based on starts/ends of its children and middles (if any)
   */
  rasterize(minStart: number, maxEnd: number) {
    const middles = this.node.middles ?? []

    this.node.start = min([...this.node.children.map(node => node.start), ...middles])!
    this.node.end = max([...this.node.children.map(node => node.end), ...middles])!

    if (minStart !== undefined) this.node.start = Math.min(this.node.start, minStart)
    if (maxEnd !== undefined) this.node.end = Math.max(this.node.end, maxEnd)
  }

  normalize() {
    // normalize all ids fowards from root based on their position per level

    const levels = this.node.getLevels()

    for (let level = levels.length - 1; level >= 0; level--) {
      const nodes = levels[level]

      const orderedByStart = orderBy(nodes, node => node.start)

      for (let i = 0; i < orderedByStart.length; i++) {
        const node = orderedByStart[i]
        if (node.id === i) continue

        // const siblings = node.parent?.children ?? []
        // const parentHasConflitingID = siblings.find(node => node.id === i)
        // if (parentHasConflitingID) debugger

        if (node.id === `root`) continue
        node.id = i
      }
    }
  }

  // #endregion

  // #region SYNTATIC RESOLUTION

  _resolve(index: number, syntax: SyntaxComponent): ResolveDirective {
    let directive: ResolveDirective = `as_string`

    if (syntax.type === `enclosure`) directive = this._enclosure(index, syntax as EnclosureSyntaxComponent)
    else if (syntax.type === `separator` || syntax.type === `aggregator`) directive = this._xator(index, syntax)
    else if (syntax.name === `marker`) directive = this._marker(index, syntax)
    else {
      // ERROR: Syntax not Implemented
      // eslint-disable-next-line no-debugger
      // debugger
    }

    return directive
  }

  _enclosure(index: number, enclosureSyntax: EnclosureSyntaxComponent): ResolveDirective {
    const char = this.parser.text[index]

    const itClosesThisNode = char === (this.node.syntax as EnclosureSyntaxComponent).closer
    const isOpener = char === enclosureSyntax.opener
    const isCloser = char === enclosureSyntax.closer

    // check if it is the closer expected for this node
    //    if it is, then end of node found, break from loop
    if (itClosesThisNode) return `close`

    // character is an opener for an enclosure
    //    so create a new node for the enclosure
    if (isOpener) return `open`

    // found an closer character in the wild
    //    since it is not a closer for this node, it is UNBALANCED
    if (isCloser) return `unbalanced`

    // ERROR: Enclosure behaviour not implemented
    debugger

    return null as any
  }

  _xator(index: number, syntax: SeparatorSyntaxComponent | AggregatorSyntaxComponent): ResolveDirective {
    const char = this.parser.text[index]

    const separatorSyntax = syntax as SeparatorSyntaxComponent
    const aggregatorSyntax = syntax as AggregatorSyntaxComponent

    const looksToGrandparents = !!(aggregatorSyntax.grandparents && aggregatorSyntax.grandparents.length > 0)

    const isParentValidGrandparent = !looksToGrandparents || aggregatorSyntax.grandparents.includes(this.node.parent!.syntax.name)
    const isValidParent = separatorSyntax.parents.includes(this.node.syntax.name)

    // ERROR'S N
    if (separatorSyntax.parents === undefined) debugger
    if (isValidParent && !isParentValidGrandparent) debugger

    if (isValidParent && isParentValidGrandparent) {
      if (isParentValidGrandparent && looksToGrandparents) debugger

      return `char_child`
    }

    // if current node is not an enclosure (as far as this specific separator found in syntax is concerned)
    return `as_string`
  }

  _marker(index: number, syntax: AsyntaticComponent): ResolveDirective {
    const char = this.parser.text[index]

    return `char_child`
  }

  // #endregion

  // #region SYNTATIC REORGANIZATION

  _prioritize(listOfNodes: INode[]) {
    const isMathAllowed = this.node.isMathAllowed

    // fast check if there are some priority nodes
    const hasPriorityNodes = listOfNodes.some(node => {
      if (node.syntax.type === `separator`) return true
      else if (node.syntax.type === `aggregator` && node.syntax.name !== `math_function`) return true
      else if (node.syntax.name === `marker`) return true
    })
    if (!hasPriorityNodes) return null

    // index nodes and priorities in children
    const indexedNodes = listOfNodes.map((node, index) => {
      let isRelevant = false
      // all separators are previously packaged as syntax
      if (node.syntax.type === `separator`) isRelevant = node.children.length === 0
      else if (node.syntax.type === `aggregator` && node.syntax.name !== `math_function`) isRelevant = node.children.length === 0
      else if (node.syntax.name === `marker`) {
        // markers can preceed STRING and PARENTHESIS to form a function-like thing

        const marker = node.substring
        const string = listOfNodes[index + 1]
        const parenthesis = listOfNodes[index + 2]

        if (string?.syntax.name === `string` && parenthesis?.syntax.name === `parenthesis`) {
          // could be a possible thing

          const name = string.substring.toLowerCase()

          // bail out if it is empty
          const isEmpty = name.replaceAll(` `, ``) === ``
          if (!isEmpty) {
            const isMathFunctionMarker = marker === `@`
            const allowMathFunctions = isMathAllowed && node.parent?.syntax.name !== `math_function`

            const continueChecking = !isMathFunctionMarker || (isMathFunctionMarker && allowMathFunctions)

            if (continueChecking) {
              const recognizedFunctionNames = RECOGNIZED_FUNCTIONS[marker] ?? []
              if (recognizedFunctionNames.length > 0) {
                // check against a list of recognized functions
                const isRecognized = recognizedFunctionNames.some(recognizedName => recognizedName.toLowerCase() === name)
                if (isRecognized) isRelevant = true
              }
            }
          }
        }
      }

      let priority = undefined
      if (isRelevant) {
        priority = (node.syntax as any).prio ?? 0
        if (typeof priority !== `number`) priority = priority[node.substring] ?? 0
      }

      return { node, index, priority } as IndexedAndPrioritizedNode
    })

    if (!indexedNodes.find(({ priority }) => !isNil(priority))) return null

    // get highest priority node
    // const orderedPriorities = orderBy(indexedNodes, ({ priority }) => priority ?? -1, [`desc`])
    // const prioritaryNode = orderedPriorities[0]
    const prioritaryNode = maxBy(indexedNodes, ({ priority }) => priority ?? -1)!
    if (isNil(prioritaryNode)) return null

    // ERROR: wtf
    if (isNil(prioritaryNode.priority)) debugger

    // isolate mostest prioritariest
    const prioritarySyntax = prioritaryNode.node.syntax
    let prioritaryNodes = [prioritaryNode]

    //    for math_operator JUST THE FIRST ONE is mostest prioritariest, not the rest
    if (prioritarySyntax.name !== `math_operator`) prioritaryNodes = indexedNodes.filter(({ priority }) => priority === prioritaryNode.priority)

    // const lesserPriorities = orderedPriorities.filter(({ node, priority }) => {
    //   if (isNil(priority)) return false

    //   //    for math_operator JUST THE FIRST ONE is mostest prioritariest, not the rest
    //   if (prioritarySyntax.name !== `math_operator`) return node.context !== prioritaryNode.node.context

    //   return priority !== prioritaryNode.priority
    // })
    // if (lesserPriorities.length > 0) debugger

    return {
      all: indexedNodes,
      syntax: prioritarySyntax,
      node: prioritaryNode,
      nodes: prioritaryNodes,
      indexes: prioritaryNodes.map(({ index }) => index),
      // lesser: lesserPriorities.map(({ node }) => node.syntax.name),
    }
  }

  _reorganize(prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // string + parenthesis -> math_function

    let master: INode = null as any

    if (prioritary.syntax.name === `marker`) master = this._reorganize_function(prioritary, options)
    else if (prioritary.syntax.type === `separator`) master = this._reorganize_separator(prioritary, options)
    else if (prioritary.syntax.type === `aggregator`) master = this._reorganize_aggregator(prioritary, options)
    else {
      console.log(`-----------`)
      this.node.tree()
      console.log(prioritary)

      // ERROR: Syntax not implemented
      debugger
    }

    return master
  }

  _reorganize_function(prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // f  ...  g abc d...e

    const a = prioritary.node.index
    const b = prioritary.node.index + 1
    const c = prioritary.node.index + 2

    const marker = prioritary.all[a]
    const name = prioritary.all[b]
    const args = prioritary.all[c]

    const _marker = marker.node.substring

    let syntax = SYNTAX_COMPONENTS.directive
    if (_marker === `@`) syntax = SYNTAX_COMPONENTS.math_function

    const master = this._new(marker.node.start, syntax, marker.node.id)
    this.node.children.splice(this.node.children.length - 1, 1) // immediately remove master from children (to readd later)

    // close master
    master.end = args.node.end
    master.middles = [name.node.end!]

    // add children
    master.addChild(marker.node)
    master.addChild(name.node)
    master.addChild(args.node)

    // rasterize to correct start/end
    master.rasterize(marker.node.start, args.node.end!)

    // readd to node replacing name+args
    this.node.children.splice(a, 3, master)

    // RE-RESOLVE ARGS!!!
    //    to deal with shit that can only be resolved inside math_function, like most logical_X
    //    it removed the need to reorganize after adding it to math_function
    args.node.children = []
    args.node.resolve(options)

    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    return master
  }

  _reorganize_separator(prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // choose prioritary node as master (first one, at least)
    let master = prioritary.node.node

    // ERROR: Unimplemented for when master node ALREADY has children
    if (master.children.length > 0) debugger

    master.middles = prioritary.nodes.map(({ node }) => node.start)

    // a!b...c a!b...c a!b...c a!b...c // colon
    // a!b ... a!b ... a!b ... a!b ... // colon:before_split_last

    if ([`math_operator`].includes(prioritary.syntax.name)) master = this._reorganize_math_operator(master, prioritary, options)
    else if ([`comma`, `pipe`].includes(prioritary.syntax.name)) master = this._reorganize_comma_pipe(master, prioritary, options)
    else {
      // ERROR: Separator not implemented
      debugger
    }

    return master
  }

  _reorganize_math_operator(master: Node, prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // ...f ? a...b ! c...d ? e ...

    const previousPrioritaryNode = prioritary.all.findLast(({ index, priority }) => priority === prioritary.node.priority && index < prioritary.node.index)
    const nextPrioritaryNode = prioritary.all.find(({ index, priority }) => priority === prioritary.node.priority && index > prioritary.node.index)

    const a = (previousPrioritaryNode?.index ?? -1) + 1
    const b = prioritary.node.index - 1
    const c = prioritary.node.index + 1
    const d = (nextPrioritaryNode?.index ?? prioritary.all.length) - 1

    const before = (prioritary.all[a - 1] ?? { node: { end: prioritary.all[0].node.start - 1 } }).node
    const after = prioritary.all[d].node

    // slice sides
    let _left = prioritary.all.slice(a, b + 1).map(({ node }) => node)
    let _right = prioritary.all.slice(c, d + 1).map(({ node }) => node)

    if (_left.length === 0) _left = [this._nil(0, before.end!)]
    if (_right.length === 0) _right = [this._nil(0, after.end!)]

    // enlist side nodes
    const left = this._list(0, _left)
    const right = this._list(1, _right)

    master.addChild(left)
    master.addChild(right)

    // reorganize because
    left.reorganize(options)
    right.reorganize(options)

    // rasterize master to secure correct ranges
    master.rasterize(_left.length === 0 ? master.start : _left[0].start, _right.length === 0 ? master.end! : _right[0].end!)

    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    // remove side nodes from children
    this.node.children.splice(c, d - c + 1)
    this.node.children.splice(a, b - a + 1)

    return master
  }

  _reorganize_comma_pipe(master: Node, prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // ! a...b ! a...b ! a...b ! a...b // comma, pipe

    // make a list of ranges (indexA, indexB) of all non-separator nodes, the "inbetweeners"

    const ranges = zip([0, ...prioritary.indexes.map(i => i + 1)], [...prioritary.indexes, prioritary.all.length]) as [number, number][]
    const subset = ranges.map(([a, b]) => prioritary.all.slice(a, b))

    for (let i = 0; i < subset.length; i++) {
      const [a, b] = ranges[i]
      let children = subset[i].map(({ node }) => node)

      // if there is NO nodes in between, create a "nil" node to fill the gap
      if (children.length === 0) {
        // create a proxy (if necessary) for the previous node to the subset
        const previous = (prioritary.all[a - 1] ?? { node: { end: prioritary.all[0].node.start - 1 } }).node

        children = [this._nil(0, previous.end!)]
      }

      // this "list" acts as a wrapper that will be added to master (later in simplify it can be, well, simplified)
      const list = this._list(master.children.length, children)
      master.addChild(list)

      list.reorganize(options)
    }

    master.rasterize(subset[0].length === 0 ? master.start : subset[0][0].node.start, last(subset)!.length === 0 ? master.end! : last(last(subset)!)!.node.end!)

    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    // faster than splicing ALL the rest
    this.node.children = [master]

    return master
  }

  _reorganize_aggregator(prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // choose prioritary node as master (first one, at least)
    let master = prioritary.node.node

    // ERROR: Unimplemented for when master node ALREADY has children
    if (master.children.length > 0) debugger

    // a!b...c a!b...c a!b...c a!b...c // colon
    // a!b ... a!b ... a!b ... a!b ... // colon:before_split_last

    if ([`logic_if`].includes(prioritary.syntax.name)) master = this._reorganize_logic_if(master, prioritary, options)
    else if (prioritary.syntax.name === `directive`) master = this._reorganize_directive(master, prioritary, options)
    else {
      console.log(`-----------`)
      this.node.tree()
      console.log(prioritary)

      // ERROR: Aggregator not implemented
      debugger
    }

    return master
  }

  _reorganize_directive(master: Node, prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // e  ...  f ab c...d

    master.parent?.tree()

    const a = prioritary.node.index
    const b = prioritary.node.index + 1

    const name = prioritary.all[a]
    const args = prioritary.all[b]

    debugger

    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    return master
  }

  _reorganize_logic_if(master: Node, prioritary: Exclude<ReturnType<NodeResolver[`_prioritize`]>, null>, options: Partial<NodeResolveOptions>) {
    // set all characters as middles (mostly for printing ease)
    master.middles = prioritary.nodes.map(({ node }) => node.middles).flat()

    // a...b THEN c      ...     f
    // a...b THEN c...f ELSE f...f
    // a...b THEN c...d ELSE e...f

    const then_ = prioritary.nodes[0]
    const else_ = prioritary.nodes[1]

    const hasElse = else_ !== undefined

    const a = 0
    const b = then_.index - 1
    const c = then_.index + 1

    const f = prioritary.all.length - 1

    const d = !hasElse ? f : else_.index - 1
    const e = !hasElse ? f : else_.index + 1

    const a_conditional = prioritary.all.slice(a, b + 1).map(({ node }) => node)
    const a_then = prioritary.all.slice(c, d + 1).map(({ node }) => node)
    const a_else = prioritary.all.slice(e, f + 1).map(({ node }) => node)

    const _condition = this._list(0, a_conditional)
    const _then = this._list(1, a_then)
    const _else = !hasElse ? (null as any) : this._list(2, a_else)

    master.addChild(_condition)
    master.addChild(_then)
    if (hasElse) master.addChild(_else)

    // reorganize because
    _condition.reorganize(options)
    _then.reorganize(options)
    if (hasElse) _else.reorganize(options)

    // rasterize master to secure correct ranges
    const _left = a_conditional
    const _right = hasElse ? a_else : a_then
    master.rasterize(_left.length === 0 ? master.start : _left[0].start, _right.length === 0 ? master.end! : _right[0].end!)

    // faster than splicing ALL the rest
    this.node.children = [master]

    const validation = this.node.validate()
    if (!validation.success && this.node.tree()) debugger

    return master
  }

  // #endregion

  // #region SIMPLIFICATION

  _simplify_children() {
    let somethingWasSimplified = false
    const children = this.node.children

    // let children simplify themselves as individual nodes
    for (let i = 0; i < children.length; i++) {
      const child = children[i]

      const simple = child.simplify()

      if (simple) {
        somethingWasSimplified = true

        this.node.addChild(simple)
        children.splice(children.length - 1, 1)

        children[i] = simple
      }
    }

    // now simplify children as siblings

    //    group children by how many same-syntax siblings are in order
    type SyntaxRange = {
      name: SyntaxName
      count: number
      index: number
    }
    const syntaxRanges = [] as SyntaxRange[]

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const lastRange = last(syntaxRanges)

      // only if there is already some range in list
      if (lastRange !== undefined) {
        const { name: lastSyntax } = lastRange

        const areSameSyntax = child.syntax.name === lastSyntax
        const oneOfThemIsMarker = child.syntax.name === `marker` || lastSyntax === `marker`
        const oneOfThemIsString = child.syntax.type === `string` || lastSyntax === `string`

        const areSimilarSyntaxes = areSameSyntax || (oneOfThemIsMarker && oneOfThemIsString)

        // if child match last sibling, increase count in range list
        if (areSimilarSyntaxes) {
          syntaxRanges[syntaxRanges.length - 1].count++
          continue
        }
      }

      // if there are not ranges in list, add it to range list
      // if child does not match last sibling, add it to range list
      syntaxRanges.push({
        name: child.syntax.name,
        count: 1,
        index: i,
      })
    }

    // get a summary of all syntaxes in play
    const syntaxes = uniq(syntaxRanges.map(({ name: syntax }) => syntax))
    // eslint-disable-next-line no-constant-condition
    if (syntaxRanges.length > 0 && false) {
      for (const { name: _syntax, count, index } of syntaxRanges) {
        if (count === 1) continue

        // if there is some sequence of siblings with same syntax, group them in a single node (sometimes, not always)

        //    marker is to be treated as a string in this case
        const syntax = _syntax === `marker` ? `string` : _syntax
        if (syntax === `string`) {
          const master = children[index]
          const nodes = children.slice(index, index + count)

          // ERROR: I dont think any node here should have children
          if (nodes.some(node => node.children.length > 0)) debugger

          // merge COUNT following nodes into INDEX child
          master.syntax = SYNTAX_COMPONENTS.string
          master.start = nodes[0].start
          master.end = last(nodes)!.end

          // fill empty spaces with "null"
          children.splice(index + 1, count - 1, ...range(1, count).map(() => null as any))

          somethingWasSimplified = true
        } else {
          // other syntaxes are not simplifiable like this
          debugger
        }
      }

      const hasGaps = children.some(child => child === null)
      if (hasGaps) {
        // remove all null empty spaces
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i]
          if (child === null) children.splice(i, 1)
        }

        // normalize ids for children
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          child.id = i
        }
      }
    }

    return somethingWasSimplified
  }

  // #endregion

  // #region SPECIAL RESOLVERS

  resolveMath(): boolean {
    // check if this nodes parents CAN be math shit

    const nodes = this.node.children
    const mathAllowedChildren = nodes.filter(node => node.syntax.math || node.syntax.name.startsWith(`math_`))

    const debug_mathable_nodes = mathAllowedChildren.map(n => n.context)

    const allChildrenAreMathAllowed = mathAllowedChildren.length === nodes.length
    const nodeAcceptsMath = (this.node.syntax as any).mathParent || (nodes.length === 0 && this.node.syntax.math)

    const nodeRedirectMathToGrandparent = (this.node.syntax as any).mathGrandparent && this.node.parent
    const parentAcceptsMath = nodeRedirectMathToGrandparent && (this.node.parent!.syntax as any).mathParent

    if (!allChildrenAreMathAllowed || !nodeAcceptsMath) {
      let wrappedSomethig = false

      // if only a part of nodes are mathable, then wrap math at them individually
      //    "wrapping" in this context means we create a NEW NODE (math_expressions) that encompasses all shit mathematical
      for (const node of nodes) {
        wrappedSomethig = node.resolveMath() || wrappedSomethig
      }

      return wrappedSomethig
    }

    if (this.node.hasAncestor(`quotes`)) return false

    // check if rasterized content has mathematical charset
    let content = this.node.substring
    if (this.node.syntax.type === `enclosure`) content = content.substring(1, content.length - 1) // removing edges for enclosures

    this.node.children = []

    // wrap content as a math expression
    const start = this.node.syntax.type === `enclosure` ? this.node.start + 1 : this.node.start

    const math = this._new(start, SYNTAX_COMPONENTS.math_expression)
    math.end = this.node.syntax.type === `enclosure` ? this.node.end! - 1 : this.node.end!

    math.resolve({ syntax: [...MATH_SYNTAX_NAMES, ...LOGIC_SYNTAX_NAMES] })

    this.parser.root.simplify()
    this.parser.root.normalize()

    return true
  }

  // #endregion
}
