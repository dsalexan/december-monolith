// #region Lexical Attributes

import type Node from "../node"

export interface LexicalAttributes {
  // LITERAL
  atomic: `string` | `number` | `boolean`
  // SEPARATOR
  variant: `intermediary` | `opener` | `closer` | `opener-and-closer`
  // (infinite n-arities)
  traversalIndex?: number
}

// #endregion

export interface BaseAttributes<TValue = any> {
  value: TValue
}

export type Attributes<TValue = any> = BaseAttributes<TValue> & LexicalAttributes
