export type VariableType = `string` | `number` | `bigint` | `boolean` | `symbol` | `undefined` | `null` | `function` | `object` | `array`

export const PrimitiveVariableTypes = [`string`, `number`, `bigint`, `boolean`, `symbol`, `undefined`, `null`] as VariableType[]

export const VariableTypes = [...PrimitiveVariableTypes, `function`, `object`, `array`] as const
