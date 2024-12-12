// export type VariableType = `string` | `number` | `bigint` | `boolean` | `symbol` | `undefined` | `null` | `function` | `object` | `array`

export const PRIMITIVE_DEFINED_VARIABLE_TYPES = [`string`, `number`, `bigint`, `boolean`, `symbol`] as const

export const PRIMITIVE_VARIABLE_TYPES = [...PRIMITIVE_DEFINED_VARIABLE_TYPES, `undefined`, `null`] as const

export const OBJECT_VARIABLE_TYPES = [`object`, `array`, `function`] as const

export const DEFINED_VARIABLE_TYPES = [...PRIMITIVE_DEFINED_VARIABLE_TYPES, ...OBJECT_VARIABLE_TYPES] as const
export const VARIABLE_TYPES = [...PRIMITIVE_VARIABLE_TYPES, ...OBJECT_VARIABLE_TYPES] as const

export type PrimitiveDefinedVariableType = (typeof PRIMITIVE_DEFINED_VARIABLE_TYPES)[number]
export type PrimitiveVariableType = (typeof PRIMITIVE_VARIABLE_TYPES)[number]
export type ObjectVariableType = (typeof OBJECT_VARIABLE_TYPES)[number]

export type VariableType = (typeof VARIABLE_TYPES)[number]
export type DefinedVariableType = (typeof DEFINED_VARIABLE_TYPES)[number]
