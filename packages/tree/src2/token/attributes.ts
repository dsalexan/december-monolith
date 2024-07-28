// #region Lexical Attributes

export interface LexicalAttributes {
  // LITERAL
  atomic: `string` | `number` | `boolean`
  // SEPARATOR
  variant: `intermediary` | `opener` | `closer` | `opener-and-closer`
}

// #endregion

export interface BaseAttributes<TValue = any> {
  value: TValue
}

export type Attributes<TValue = any> = BaseAttributes<TValue> & LexicalAttributes
