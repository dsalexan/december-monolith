import { Node } from "../tree"

export function getRepeatingNodes(...nodes: Node[]) {
  const nonRepeatingNodes: Node[] = []
  const repeatingNodes: Node[] = []

  const signatureMap: Map<string, Node[]> = new Map()
  for (const node of nodes) {
    const signature = node.getSignature()

    const list: Node[] = signatureMap.get(signature) ?? []
    list.push(node)
    signatureMap.set(signature, list)
  }

  for (const [signature, list] of signatureMap.entries()) {
    if (list.length === 1) nonRepeatingNodes.push(list[0])
    else repeatingNodes.push(list[0])
  }

  return { nonRepeating: nonRepeatingNodes, repeating: repeatingNodes }
}
