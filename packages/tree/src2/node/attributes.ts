import type Node from "."

export interface SemanticalAttributes {
  originalNodes?: Node[]
  tags: string[]
  reorganized?: boolean
}

export type Attributes = SemanticalAttributes
