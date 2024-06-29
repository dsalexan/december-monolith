import { flatten, flattenDeep, isArray, isNil, last, range, uniq, uniqBy, zip, difference, sortBy } from "lodash"
import type TreeParser from "."

import { SyntaxNode } from "../node"
import { EnclosureSyntax } from "../syntax/enclosure"
import { MATH_SYNTAXES, SyntaxName, SyntaxWithSymbol } from "../syntax/manager"
import { Syntax, SyntaxReference } from "../syntax/syntax"
import { isDebuggerStatement } from "typescript"
import { SeparatorSyntax } from "../syntax/separator"
import { Utils } from ".."
import { FoldProtocol, MasterProtocol, PatternSyntax, PatternToken, RenameProtocol, ReparseProtocol, TokenUnfoldProtocol, UnfoldProtocol } from "../syntax/pattern"
import NodePrinter from "../printer"

export default class Reorganizer {
  parser: TreeParser

  get syntaxManager() {
    return this.parser.syntaxManager
  }

  constructor(parser: TreeParser) {
    this.parser = parser
  }

  _prioritize(node: SyntaxNode) {
    type SyntaxNameAndPriority = string
    // const nodesBySyntaxAndPriority = {} as Record<SyntaxNameAndPriority, number[]> // <syntax>#<priority> -> node indexes
    // // const syntaxesByPriority = {} as Record<number, [SyntaxName, string[]][]> // priority -> [syntaxName, symbols[]]
    // const syntaxesByPriority = {} as Record<number, Record<SyntaxName, string>[]> // priority -> syntax name -> symbols[]

    const INDEX = {
      nodes: {
        bySyntaxAndPriority: {} as Record<SyntaxNameAndPriority, number[]>, // <syntax>#<priority> -> child index[]
      },
      syntaxes: {
        byPriority: {} as Record<number, Map<SyntaxName, string[]>>, // priority -> syntax name (MAP cause ordered dict) -> symbols[]
        byNode: {} as Record<number, SyntaxReference>, // child index -> syntax reference
      },
    }

    // small number is higher priority, but ill be calling "chosenPriority" for sanity's sake
    let chosenPriority = Infinity
    let priorities = [] as number[]

    // we check if existing nodes have "reorganization priority" before everything
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index] as SyntaxNode

      // syntax must have a priority OR be a match to some syntatic pattern

      // 0. check if token matches the expected patterns to a symbol of any syntax
      const patternMatches = this.syntaxManager.match({ syntax: child.__syntax, symbol: child.__syntaxSymbolKey, type: child.syntax.type }, `reorganize`)
      const syntaxPool: SyntaxWithSymbol[] = [...patternMatches.map(({ syntax, symbol }) => ({ syntax: this.syntaxManager.get(syntax as any), symbol: symbol }))]

      // 1. if node's own syntax is eligible (not reorganized AND not a master)
      if (child.state !== `reorganized` && child.syntaxSymbol !== `master`) syntaxPool.push({ syntax: child.syntax, symbol: child.__syntaxSymbolKey })

      // ERROR: Some syntax is missing
      if (syntaxPool.some(isNil)) debugger

      // 2. choose most prioritiest syntax from pool
      const prioritizedSyntaxPool = syntaxPool.filter(({ syntax }) => !isNil(syntax.priority))
      const sortedSyntaxPool = sortBy(prioritizedSyntaxPool, ({ syntax }) => syntax.priority!) /// SMALL PRIORITY IS BETTER

      if (sortedSyntaxPool.length === 0) continue // no syntaxes to reorganize, bail out

      const [reorganizableSyntax] = sortedSyntaxPool
      const childsOwnReorganizableSyntax = child.__syntax === reorganizableSyntax.syntax.name && child.__syntaxSymbolKey === reorganizableSyntax.symbol

      // 3. separator must NOT have children
      let priority = reorganizableSyntax.syntax.priority as number

      // ERROR: Syntax has no priority
      if (isNil(priority)) debugger

      //      IMPORTANT: only reorganize empty separators (only relevant if reorganizableSyntax is the one from the child itself)
      if (childsOwnReorganizableSyntax && child.syntax.type === `separator`) {
        if (child.children.length > 0) continue
      }

      // 4. syntax restrictions must be obeyed (if any)
      if (reorganizableSyntax.syntax.restrictions.shouldValidate(`reorganize`)) {
        const { valid, invalidRestrictions } = reorganizableSyntax.syntax.restrictions.validate(child, `reorganize`)

        if (!valid) continue
      }

      const syntaxSymbol = reorganizableSyntax.syntax.symbols.find(symbol => symbol.key === reorganizableSyntax.symbol)

      // 5. ignore if node has a symbol, but symbol has no reorganization rules ("master" falls within this case, but we are removing it first thing to speedup shit)
      if (reorganizableSyntax.symbol !== undefined && syntaxSymbol === undefined) continue

      // 6. consider symbol priority modifier
      const priorityModifier = syntaxSymbol?.priority as number | undefined
      if (priorityModifier !== undefined) priority += priorityModifier

      // 7. symbol restrictions must be obeyed (if any)
      if (syntaxSymbol) {
        if (syntaxSymbol.restrictions.shouldValidate(`reorganize`)) {
          const { valid, invalidRestrictions } = syntaxSymbol.restrictions.validate(child, `reorganize`)

          if (!valid) continue
        }
      }

      // index shit
      const syntaxAndPriority = `${reorganizableSyntax.syntax.name}#${priority}` as SyntaxNameAndPriority

      // index prior  ty
      if (priority < chosenPriority) chosenPriority = priority
      if (!priorities.includes(priority)) priorities.push(priority)

      // index child index
      INDEX.nodes.bySyntaxAndPriority[syntaxAndPriority] ??= []
      INDEX.nodes.bySyntaxAndPriority[syntaxAndPriority].push(index)

      // index syntax by priority
      INDEX.syntaxes.byPriority[priority] ??= new Map()

      const syntaxName = reorganizableSyntax.syntax.name as SyntaxName
      const listOfSymbols = INDEX.syntaxes.byPriority[priority].get(syntaxName) ?? ([] as string[])
      if (syntaxSymbol && !listOfSymbols.includes(syntaxSymbol.key)) listOfSymbols.push(syntaxSymbol.key)
      INDEX.syntaxes.byPriority[priority].set(syntaxName, listOfSymbols)

      // index target reorganizable syntax by node (child index actually)

      // ERROR: Index for child index already exists
      if (INDEX.syntaxes.byNode[index]) debugger

      INDEX.syntaxes.byNode[index] = { syntax: syntaxName }
      if (syntaxSymbol) INDEX.syntaxes.byNode[index].symbol = syntaxSymbol.key
    }

    return { _: INDEX, chosenPriority, priorities: priorities.sort((a, b) => a - b) }
  }

  reorganize(node: SyntaxNode) {
    if (node.state === `crude`) debugger

    let somethingWasReorganized = false

    // reorganize node until there is nothing left to reorganize
    let run = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // prioritize reorganizable nodes
      const { _, chosenPriority, priorities } = this._prioritize(node)

      // if there is no node with reorganization priority, then, technically, everything is "reorganized"
      if (chosenPriority === Infinity) break

      const [syntax, symbols] = [..._.syntaxes.byPriority[chosenPriority].entries()][0] // always get firstmost prioritest syntax
      const syntaxAndPriority = `${syntax}#${chosenPriority}`
      const nodeIndexes = _.nodes.bySyntaxAndPriority[syntaxAndPriority]

      const targetSyntax = { name: syntax, symbols, nodes: nodeIndexes.map(index => ({ child: index, reference: _.syntaxes.byNode[index] })) }

      this._reorganize(node, targetSyntax, run)

      // WARN: This is a safety measure to avoid infinite loops
      if (run++ >= 100) debugger
    }

    node.state = `reorganized`

    return somethingWasReorganized
  }

  _reorganize(parent: SyntaxNode, target: { name: SyntaxName; symbols: string[]; nodes: { child: number; reference: SyntaxReference }[] }, run: number) {
    // if (syntaxesByPriority[highestPriority].length !== 1) debugger

    const syntax = this.syntaxManager.get(target.name)
    const nodeIndexes = target.nodes.map(({ child }) => child)
    const nodes = nodeIndexes.map(child => parent.children[child] as SyntaxNode)

    // validate if some node has another syntax
    if (target.nodes.some(({ reference }) => reference.syntax !== target.name)) debugger

    const isBinary = (syntax as any).binary

    // decide HOW to reorganize this nodes
    let { directive } = this._decide(syntax, target.symbols)
    if (directive === `unknown`) debugger

    if (directive === `list_inbetweeners`) {
      // 0. get all other nodes between those in nodeIndexes
      const _inbetweeners = zip([0, ...nodeIndexes.map(i => i + 1)], [...nodeIndexes, parent.children.length]) as [number, number][]
      const inbetweeners = _inbetweeners.map(([a, b]) => parent.children.slice(a, b))

      // 1. for each subset, make a list and add to master
      let master: SyntaxNode | null = null
      for (let i = 0; i < inbetweeners.length; i++) {
        // if syntax is binary (only left and right nodes as children)
        let binaryNesting: SyntaxNode | null = null
        if (isBinary && master?.children.length === 2) {
          // add current master as first child of NEXT master
          binaryNesting = master
          master = null
        }

        // fetch master node
        if (master === null) {
          // always start with first matched node
          master = nodes.shift()!.setSyntax(target.name, `master`)
          if (master.children.length !== 0) debugger

          // re-add for binary nesting (if any)
          if (binaryNesting) {
            // enlist node and add to master
            const list = master.child().setSyntax(`list`)
            list.state = `reorganized` // i imagine a "list" node doesnt need a value (and calculating one is kind of unnecessary) and is "automatically" resolved
            list.addChild(binaryNesting)

            // no need to reorganize, as it is already reorganized
          }
        }

        let subset = inbetweeners[i]

        // if list would be empty, create a stub (nil node) inside it
        if (subset.length === 0) subset = [parent.child(0).setSyntax(`nil`).close(``)]

        // enlist nodes and add to master
        const list = master.child().setSyntax(`list`)
        list.state = `resolved` // i imagine a "list" node doesnt need a value (and calculating one is kind of unnecessary) and is "automatically" resolved
        list.addChild(...subset)

        // recursive reorganize new list
        this.reorganize(list)
      }

      // 3. add master to parent
      if (!master) debugger
      parent.__children = [master!]
    } else if (directive === `by_protocol`) {
      const patternSyntax = syntax as PatternSyntax

      // 0. clear all children of node by default, we re-add them later ass necessary
      const originalChildren = [...parent.__children] as SyntaxNode[]
      parent.__children = []

      // 2. loop through every match, applying same-level protocols (keep, fold, unfold) and recording which nodes were affected
      const affectedNodesByMatch = [] as { accountingFor: number[]; nodes: SyntaxNode[] }[][] // for each match, returns a list of (nodes, original indexes that should be accounted for)

      for (let i = 0; i < nodeIndexes.length; i++) {
        const index = nodeIndexes[i]
        const child = originalChildren[index]

        const syntaxSymbol = target.nodes[i].reference.symbol!
        if (!syntaxSymbol) debugger

        const pattern = patternSyntax.patterns[syntaxSymbol]
        if (!pattern) debugger

        const affectedNodes = [] as { accountingFor: number[]; nodes: SyntaxNode[] }[]

        // apply protocols
        for (const _protocol of pattern.protocols) {
          if (_protocol.type === `master`) continue
          else if (_protocol.type === `keep`) {
            // keep itself as it is
            affectedNodes.push({ accountingFor: [index], nodes: [child] })
          } else if ([`rename`, `fold`, `unfold`, `reparse`].includes(_protocol.type)) {
            const protocol = _protocol as FoldProtocol | UnfoldProtocol | RenameProtocol | ReparseProtocol

            // extract targets
            const start = protocol.target[0] === -Infinity ? (nodeIndexes[i - 1] ?? -1) + 1 : protocol.target[0] + index
            const end = protocol.target[1] === Infinity ? (nodeIndexes[i + 1] ?? originalChildren.length) - 1 : protocol.target[1] + index

            const _targets = range(start, end + 1)
            const targets = _targets.map(i => originalChildren[i]).filter(n => !!n) as SyntaxNode[]

            if (protocol.type === `rename`) {
              const renameProtocol = _protocol as RenameProtocol

              for (const target of targets) target.setSyntax(syntax.name, renameProtocol.as)

              affectedNodes.push({ accountingFor: [index, ..._targets], nodes: targets })
            } else if (protocol.type === `reparse`) {
              const reparseProtocol = protocol as ReparseProtocol

              // TODO: Implement flatten protocol with depth <> 1
              if (reparseProtocol.depth !== 1) debugger

              // TODO: Implement flatten protocol for multiple targets
              if (targets.length !== 1) debugger
              const target = targets[0]

              // recursive reparse new flat node, if necessary

              // 1. decide which syntaxes we are adding
              //        TODO: Allow for different evaluations (currently it just do math)
              const syntaxes: SyntaxName[] = [...MATH_SYNTAXES]

              // 1.5. we judge necessity by the syntaxes we are adding (if there are any differences between current syntaxes X new syntaxes, we reparse)
              const currentSyntaxes = this.syntaxManager.syntaxNames()
              const hasDiffs = syntaxes.some(syntax => !currentSyntaxes.includes(syntax))
              if (hasDiffs) {
                // 2. flat targets into a string expression
                //    TODO: Implement token extract for pretty much anything but a parenthesis
                if (target.syntax.type !== `enclosure`) debugger

                const tokens: string[] = [target.value?.slice(1, -1) ?? ``]

                // TODO: Check for many/no tokens
                if (tokens.length !== 1) debugger
                const _expression = tokens.join(` `)

                // create new string node for expression(TODO: Implement reparse protocol with depth <> 1)
                target.__children = []
                const expression = target.child().setSyntax(`string`)
                expression.value = _expression
                expression.state = `crude`

                this.parser._reparse(expression, expression.value!, syntaxes)
              }

              // rename target if necessary
              //    TODO: How doest it work with a depth !== 1???
              if (reparseProtocol.rename) for (const target of targets) target.setSyntax(syntax.name, reparseProtocol.rename)

              affectedNodes.push({ accountingFor: [index, ..._targets], nodes: targets })
            } else if (protocol.type === `fold`) {
              const foldProtocol = protocol as FoldProtocol

              // enlist targets
              const list = parent.child().setSyntax(`list`)
              list.state = `resolved` // I imagine a "list" node doesnt need a value (and calculating one is kind of unnecessary) and is "automatically" resolved
              list.addChild(...targets)

              affectedNodes.push({ accountingFor: [index, ..._targets], nodes: [list] })

              // update syntax/symbol as per alias
              const __syntax = typeof foldProtocol.alias === `string` ? target.name : foldProtocol.alias?.syntax ?? target.name
              const __symbol = !foldProtocol.alias ? syntaxSymbol : typeof foldProtocol.alias === `string` ? foldProtocol.alias : foldProtocol.alias?.symbol ?? syntaxSymbol
              list.setSyntax(__syntax!, __symbol)

              // recursive reorganize new list
              this.reorganize(list)
            } else if (protocol.type === `unfold`) {
              const unfoldProtocol = protocol as UnfoldProtocol

              // for each target, extract children ("unfold")
              for (let j = 0; j < targets.length; j++) {
                const target = targets[j]
                const children = target.children as SyntaxNode[]

                affectedNodes.push({ accountingFor: [index, _targets[j]], nodes: [...children] })
              }
            }
          } else {
            // ERROR: Unimplemented protocol for symbol application
            debugger
          }
        }

        affectedNodesByMatch[i] = affectedNodes
      }

      // 0.a. re-clear children (since we used node to create new nodes, as in for enlisting shit)
      parent.__children = []

      // 3. loop through every match AGAIN to apply hierarchical protocols (master)
      for (let i = 0; i < nodeIndexes.length; i++) {
        const index = nodeIndexes[i]
        const child = originalChildren[index]

        const syntaxSymbol = target.nodes[i].reference.symbol!
        const pattern = patternSyntax.patterns[syntaxSymbol]

        const affectedNodes = affectedNodesByMatch[i]
        const nodes = affectedNodes.map(({ nodes }) => nodes).flat()
        const accountingFor = uniq(affectedNodes.map(({ accountingFor }) => accountingFor).flat())

        for (const _protocol of pattern.protocols) {
          if (_protocol.type === `master`) {
            const masterProtocol = _protocol as MasterProtocol

            // create new master
            const master = parent.child().setSyntax(target.name, `master`)

            if (masterProtocol.target === `affected`) {
              master.addChild(...nodes)
              affectedNodesByMatch[i] = [{ accountingFor, nodes: [master] }]
            } else {
              debugger
            }
          }
        }
      }

      // 4. re-add non-accounted-for nodes
      let children = [] as SyntaxNode[]

      const accountedFor = uniq(flatten(affectedNodesByMatch.flat().map(({ accountingFor }) => accountingFor)))
      for (let index = 0; index < originalChildren.length; index++) {
        const isSyntaxMatch = nodeIndexes.includes(index)

        // if node is a match, add all affected in its place
        if (isSyntaxMatch) {
          const matchIndex = nodeIndexes.indexOf(index)
          const affectedNodes = affectedNodesByMatch[matchIndex]
          const nodes = affectedNodes.map(({ nodes }) => nodes).flat()

          children.push(...nodes)
        }

        // if node is already accounted for by other node, ignore
        if (accountedFor.includes(index)) continue

        // if node is not accounted for, add it
        children.push(originalChildren[index])
      }

      // 5. apply SYNTAX hierarchical protocols
      for (const _protocol of patternSyntax.protocols) {
        if (_protocol.type === `master`) {
          const masterProtocol = _protocol as MasterProtocol

          // create new master
          const master = parent.child().setSyntax(target.name, `master`)

          if (masterProtocol.target === `all`) {
            master.addChild(...children)
            children = [master]
          } else {
            debugger
          }
        }
      }

      // 0.a. re-clear children (since we used node to create new nodes, as in for enlisting shit)
      parent.__children = []
      parent.addChild(...children)
    } else {
      debugger
    }
  }

  // #region Decision making

  _decide(syntax: Syntax, symbols: string[]): { directive: ReorganizeDirective } {
    let directive: ReorganizeDirective = `unknown`

    if (syntax.type === `separator`) directive = `list_inbetweeners`
    else if (syntax.type === `pattern`) directive = `by_protocol`
    else {
      // ERROR: Syntax not implemented
      debugger
    }

    return { directive }
  }

  _list_inbetweeners() {}

  // #endregion
}

const REORGANIZE_DIRECTIVES = [`unknown`, `list_inbetweeners`, `by_protocol`] as const

type ReorganizeDirective = (typeof REORGANIZE_DIRECTIVES)[number]
