import { SyntaxName } from "../syntax"
import SyntaxNode from "./syntaxNode"

export function groupNodesBySyntaxSymbol(nodes: SyntaxNode[], syntax: SyntaxName) {
  return nodes.reduce((acc, node, index) => {
    if (node.syntax.name !== syntax) return acc

    const symbol = String(node.syntaxSymbol)

    // multiple nodes per symbol (not implemented)
    if (acc[symbol]) debugger

    return {
      ...acc,
      [symbol]: {
        node,
        index,
      },
    }
  }, {}) as Record<string, { node: SyntaxNode; index: number }>
}

/** cluster all non-syntax nodes in list, keeping syntax nodes as single objects */
export function clusterNonSyntaxNodes(nodes: SyntaxNode[], syntax: SyntaxName) {
  const clusters = [] as (SyntaxNode[] | SyntaxNode)[]

  let currentCluster = [] as SyntaxNode[]
  for (const node of nodes) {
    if (node.syntax.name === syntax) {
      if (currentCluster.length > 0) clusters.push(currentCluster)
      clusters.push(node)
      currentCluster = []
    } else {
      currentCluster.push(node)
    }
  }

  if (currentCluster.length > 0) clusters.push(currentCluster)

  return clusters
}
