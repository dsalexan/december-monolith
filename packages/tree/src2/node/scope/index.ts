import assert from "assert"
import { intersection, isString, last, uniq } from "lodash"
import { Nullable } from "tsdef"

import Node, { SubTree } from ".."

import { IsolationScope, MasterScope, Scope } from "./types"
import { inContext, postOrder, preOrder } from "../traversal"

import logger, { Block, paint } from "../../logger"
import { NodeScope } from "../node/base"

export { MasterScope, Scope } from "./types"

export interface ScopeEvaluationOptions {
  master: MasterScope
  useTreeContext?: boolean
}

export function evaluateTreeScope(tree: SubTree, { master }: ScopeEvaluationOptions) {
  let __DEBUG = false // COMMENT

  const root: Node = tree.root

  if (__DEBUG) {
    console.log(` `)
    console.log(global.__DEBUG_LABEL_NRS)
    console.log(` `)
  }
  // if (global.__DEBUG_LABEL_NRS === `semantic[1]:s3.a`) debugger // COMMENT

  // 1. Evaluate scopes in isolation (bottom -> up)
  postOrder(root, node => {
    const scope = evaluateNodeScopeInIsolation(node, { master })
    node.setScope(`isolation`, scope)
    node.setScope(`contextualized`, undefined as any)
  })

  if (__DEBUG) debugScopeTree(root, `isolation`)

  // 2. Contextualize scope base on isolation scope
  postOrder(root, node => {
    const scope = contextualizedScopeInIsolation(node, { master })
    node.setScope(`contextualized`, scope)
  })

  if (__DEBUG) debugScopeTree(root, `contextualized`)
  // if (global.__DEBUG_LABEL_NRS === `semantic[3]:S2.a`) debugger

  // 3. Resolve derivations and Spread down scope where necessary
  postOrder(root, node => evaluateSubTreeScopeInDerivation(node, { master }))

  if (__DEBUG) debugScopeTree(root, `contextualized`)

  // 4. Check if all derived scopes were resolved
  postOrder(root, node => {
    const scope = node.getScope()
    assert(!scope.includes(`derived`), `Derived scope not resolved for node ${node.name}`)
  })
}

export function evaluateNodeScope(node: Node, { master }: ScopeEvaluationOptions) {
  // 1. Evaluate scopes in isolation (bottom -> up)
  const isolationScope = evaluateNodeScopeInIsolation(node, { master })
  node.setScope(`isolation`, isolationScope)

  // 2. Contextualize scope base on isolation scope
  const contextualizedScope = contextualizedScopeInIsolation(node, { master })
  node.setScope(`contextualized`, contextualizedScope)

  // // 3. Resolve derivations through children
  // if (node.children.length > 0) resolveDerivedScope(node, { master })

  // // 4. Check if all derived scopes were resolved
  // const scope = node.getScope()
  // assert(!scope.includes(`derived`), `Derived scope not resolved for node ${node.name}`)
}

// Evaluates isolation scope for a node (i.e. just the node, ignoring its position on the tree)
function evaluateNodeScopeInIsolation(node: Node, { master }: ScopeEvaluationOptions): IsolationScope[] {
  const scopes: IsolationScope[] = []

  // 1. Evaluted based on type

  // ====================================   CONFIRMED  ==============================================
  // A. Scope comes literally from literal type if everything else fails
  if ([`string`, `string_collection`].includes(node.type.name) || node.type.modules.includes(`numeric`)) scopes.push(`literal`)
  // B. Node is enclosed by quotes
  else if (node.type.name === `quotes` || node.type.name === `identifier`) scopes.push(`confirmed-string`)
  // C. Node is an operator, so it really depends on the context
  else if (node.type.id === `operator`) scopes.push(`possible-operator`)
  // D. Lists derive scope from chidren (since they act like a aggregator of shit)
  else if (node.type.name === `list` || node.type.name === `parenthesis`) scopes.push(`aggregator`)
  // E. IF's keywords (and other structural logical things) are logical
  else if (node.type.id === `keyword` || node.type.name === `function`) scopes.push(`logical-expression`)
  // ?. Generics
  else if ([`enclosure`, `separator`].includes(node.type.id)) scopes.push(`irrelevant`)
  else if (node.type.name === `root`) scopes.push(`n/a`)
  // ================================================================================================

  // ===================================   POSSIBILITY  =============================================
  // A. Node is a whitespace
  if ([`whitespace`].includes(node.type.name)) scopes.push(`possible-string`)

  // ================================================================================================

  assert(scopes.length > 0, `No scope defined for node ${node.name}`)

  // 2. Check for taboos
  if (scopes.length > 1) debugger

  return scopes
}

// Evaluates contextualized scope for a node, based on its isolation scope (and sometimes the surrounding tree context)
function contextualizedScopeInIsolation(node: Node, { master, useTreeContext }: ScopeEvaluationOptions): Scope[] {
  const scopes: Scope[] = []

  // @ts-ignore
  const isolation: IsolationScope[] = node.scope.isolation
  assert(isolation.length === 1, `Too many, unimplemented`)

  const scope = isolation[0]

  // ====================================   CONFIRMED  ==============================================
  if (scope === `confirmed-string`) scopes.push(`textual`)
  else if (scope === `logical-expression`) scopes.push(`logical`)
  else if (scope === `literal`) {
    if ([`string`, `string_collection`].includes(node.type.name)) scopes.push(`textual`)
    else if (node.type.modules.includes(`numeric`)) scopes.push(`logical`)
    //
    else throw new Error(`Unimplemented type "${node.type.getFullName()}" for literal isolated scope`)
  } else if (scope === `n/a`) {
    if (master === `math-enabled`) scopes.push(`logical`)
    else if (master === `text-processing`) scopes.push(`textual`)
    else throw new Error(`Unimplemented master scope "${master}"`)
  }
  // ================================================================================================

  // =====================================   DERIVED  ===============================================
  else if (scope.startsWith(`possible-`) || [`irrelevant`, `aggregator`].includes(scope)) {
    if (!useTreeContext) scopes.push(`derived`)
    else {
      // if (global.__DEBUG_LABEL_NRS === `semantic[2]:ρ2.c` && node.name === `ρ2.c`) debugger // COMMENT
      const treeContext = useTreeContext && getTreeContext(node)
      assert(treeContext.children.scope !== undefined || treeContext.ancestors.parentScope !== undefined, `Club cant handle`)

      const parentThenChildren = treeContext.ancestors.parentScope || treeContext.children.scope
      const childrenThenParent = treeContext.children.scope || treeContext.ancestors.parentScope

      if (scope === `possible-string`) {
        // A. Whitespace inside an argument list of a function surrounded by anything (i.e. not the first or last of list)
        if (node.type.name === `whitespace` && node.parent?.type.name === `list`) {
          const isFirstOrLast = node.index === 0 || node.index === node.parent.children.length - 1
          scopes.push(!isFirstOrLast ? `textual` : childrenThenParent)
        }
        //
        else scopes.push(childrenThenParent)
      } else if (scope === `possible-operator`) scopes.push(parentThenChildren)
      else if (scope === `aggregator`) {
        const parentFirst = intersect(node.parent!.getScope(`isolation`), [`possible-operator`])

        scopes.push(parentFirst ? parentThenChildren : childrenThenParent)
      } else if (scope === `irrelevant`) {
        // mostly for things grouping other things
        debugger
      }
      //
      else throw new Error(`Unimplemented derived isolated scope ${scope}`)
    }
  }
  // ================================================================================================
  //
  else throw new Error(`Unimplemented isolated scope ${scope}`)

  assert(scopes.length > 0, `No scope defined for node ${node.name}`)
  return scopes
}

// Resolves derived contextualized scope into a "real" scope
function resolveDerivedScope(node: Node, { master }: ScopeEvaluationOptions): NodeScope {
  const contextualizedScope = node.getScope()
  if (contextualizedScope.includes(`derived`)) {
    let derivedScope: Nullable<Scope> = null

    // 1. Choose scope based on children
    const _childrenScopes = node.children.nodes.map(child => child.getScope())
    const childrenScopes = uniq(_childrenScopes.flat()).filter(scope => scope !== `derived`)

    let derivedScopeFromChildren: Nullable<Scope> = null
    if (childrenScopes.length === 1) derivedScopeFromChildren = childrenScopes[0]
    // 1.A. If children have different scopes, decide based on master scope
    else if (childrenScopes.length === 2) {
      // if (intersect(childrenScopes, [`logical`, `textual`])) {
      //   debugger
      //   // derivedScopeFromChildren = master === `math-enabled` ? `logical` : `textual`
      // }
    }

    derivedScope = derivedScopeFromChildren

    // 2. Take parent scope into consideration for some isolated scenarios
    const isolationScope = node.getScope(`isolation`)
    // @ts-ignore
    const parentScope: NodeScope = node.parent!.scope

    // 2.1. Parent's isolation scope
    if (parentScope.isolation.length > 0) {
      // A. For aggregators inside LOGICAL EXPRESSIONS, enforce logical scope
      if (isolationScope.includes(`aggregator`) && parentScope.isolation.includes(`logical-expression`)) derivedScope = `logical`
      // B. For aggregators inside POSSIBLE LOGICAL SHIT, dont derive into textual immediatelly
      if (isolationScope.includes(`aggregator`) && parentScope.isolation.includes(`possible-operator`) && parentScope.contextualized.includes(`derived`)) derivedScope = derivedScope === `textual` ? null : derivedScope
    }

    // if (node.getScope(`isolation`).includes(`aggregator`) && node.content === `"A A" ` && parentScope.isolation.includes(`possible-operator`)) debugger

    // 2.2. Defaults to parent's contextualized scope

    // X. Replace 'derived' by derivedScope
    // assert(derivedScope !== null, `Derived scope not resolved for node ${node.name}`)
    if (derivedScope !== null) {
      node.setScope(
        `contextualized`,
        contextualizedScope.map(scope => (scope === `derived` ? (derivedScope as any) : scope)),
      )
    }
  }

  // @ts-ignore
  return node.scope
}

// Evaluates scope for entire subtree (with node as root), resolving any derivations on root AND spreading down its scope
function evaluateSubTreeScopeInDerivation(node: Node, { master }: ScopeEvaluationOptions) {
  // 1. Leaf nodes dont count
  if (node.children.length === 0) return

  // if (node.getScope(`isolation`).includes(`possible-operator`)) debugger
  // if (node.name === `L2.a`) debugger

  // 2. Try to resolve self scope (derived -> something other)
  const nodeScope = resolveDerivedScope(node, { master })

  if (!nodeScope.contextualized.includes(`derived`)) {
    // 3. Decide directive for spread down
    let directive: `resolve-derived` | `enforce-scope` = `resolve-derived`

    if (intersect<IsolationScope>(nodeScope.isolation, [`aggregator`, `possible-operator`, `n/a`, `irrelevant`, `logical-expression`])) directive = `resolve-derived`
    else if (nodeScope.isolation.includes(`confirmed-string`)) directive = `enforce-scope`
    //
    else throw new Error(`Unimplemented isolation scope "${nodeScope.isolation.join(`, `)}" for ${node.name} in directive decision`)

    // 4. Spread down scope (deciding if it is necessary based on isolation data)
    spreadDownScope(node, directive, { master })
  }
}

// Spreads down node scope based on a directive (basically resolving/enforcing scope for its offspring)
function spreadDownScope(node: Node, directive: `resolve-derived` | `enforce-scope`, { master }: ScopeEvaluationOptions) {
  const contextualizedScope = node.getScope()

  preOrder(node, child => {
    if (child.id === node.id) return

    // if (child.name === `L2.a`) debugger

    const childScope = child.getScope()

    if (directive === `resolve-derived`) {
      if (!childScope.includes(`derived`)) return

      const newChildScope = contextualizedScopeInIsolation(child, { master, useTreeContext: true })
      child.setScope(`contextualized`, childScope.map(scope => (scope === `derived` ? newChildScope : scope)).flat())
    } else if (directive === `enforce-scope`) child.setScope(`contextualized`, [...contextualizedScope])
    //
    else throw new Error(`Unimplemented directive "${directive}"`)
  })
}

function getTreeContext(node: Node) {
  // CHILDREN
  const __children = node.children.nodes.map(child => child.getScope())
  const _children = uniq(__children.flat()).filter(scope => scope !== `derived`)

  const children = {
    allScopes: __children,
    scopes: _children,
    scope: _children.length === 1 ? _children[0] : undefined,
  }

  // ANCESTORS
  const nodes: Node[] = []
  inContext(node, parent => nodes.push(parent), -Infinity, true)

  const __ancestors = nodes.map(node => node.getScope())
  const _ancestors = uniq(__ancestors.flat()).filter(scope => scope !== `derived`)

  const ancestors = {
    allScopes: _ancestors,
    scopes: _ancestors,
    parentScope: _ancestors[0],
  }

  // SIBLINGS
  const previous = node.parent?.children.nodes.slice(0, node.index) ?? []
  const next = node.parent?.children.nodes.slice(node.index + 1) ?? []

  const __previousSiblings = previous.map(child => child.getScope())
  const _previousSiblings = uniq(__previousSiblings.flat()).filter(scope => scope !== `derived`)

  const __nextSiblings = next.map(child => child.getScope())
  const _nextSiblings = uniq(__nextSiblings.flat()).filter(scope => scope !== `derived`)

  const siblings = {
    previous: {
      allScopes: __previousSiblings,
      scopes: _previousSiblings,
      scope: _previousSiblings.length === 1 ? _previousSiblings[0] : undefined,
      immediate: last(_previousSiblings),
    },
    next: {
      allScopes: __nextSiblings,
      scopes: _nextSiblings,
      scope: _nextSiblings.length === 1 ? _nextSiblings[0] : undefined,
      immediate: _nextSiblings[0],
    },
  }

  return { children, ancestors, siblings }
}

export function debugScopeTree(root: Node, type: `isolation` | `contextualized`, showContent = true) {
  console.log(` `)

  preOrder(root, node => {
    // @ts-ignore
    const scopes: NodeScope = node.scope

    logger.add(` `.repeat(node.level * 2))
    logger.add(paint.grey(node.name))
    logger.add(` `)

    for (const scope of scopes.isolation) {
      let color = paint.white
      if (scope === `irrelevant`) color = paint.grey.dim
      if (scope.startsWith(`possible`)) color = paint.yellow

      if (type === `contextualized`) color = color.grey.dim.italic

      logger.add(color(scope))
    }

    if (type === `contextualized`) {
      for (const scope of scopes.contextualized) {
        let color = paint.white
        //
        if (scope === `logical`) color = paint.blue
        if (scope === `textual`) color = paint.green
        if (scope === `derived`) color = paint.grey

        logger.add(color(scope))
      }
    }

    if (showContent) {
      logger.add(` `)
      logger.add(paint.grey.dim(node.content))
    }

    logger.debug()
  })
}

function intersect<TValue>(a: TValue[], b: TValue[]) {
  return intersection(a, b).length > 0
}
