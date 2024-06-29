export type ParsedNodeState = `resolved` | `reorganized`
export type NodeState = `crude` | ParsedNodeState

export function isParsed(state: NodeState): state is ParsedNodeState {
  return state === `resolved` || state === `reorganized`
}
