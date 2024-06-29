import type Node from ".."

export type NodeIssueType = `unbalanced` | `parentless`

export type NodeIssue = {
  type: NodeIssueType
  node: Node
  substring: string
}

export function createNodeIssue(type: NodeIssueType, node: Node, substring?: string) {
  const issue: NodeIssue = {
    type,
    node,
    substring: substring ?? node.substring,
  }

  return issue
}
