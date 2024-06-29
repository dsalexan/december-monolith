import { Unit } from "./units"

export interface BaseLogicalRepresentation {
  type: string
  node: string //SyntaxNode
}

export interface LiteralLogicalRepresentation<TValue = any> extends BaseLogicalRepresentation {
  type: `literal`
  display: string
  value: TValue
}

export interface UnitaryLogicalRepresentation extends BaseLogicalRepresentation {
  type: `unitary`
  name: Unit[`name`] // units name (like "metres")
  symbol: Unit[`symbol`] // unit matched symbol (like metres accepts any of [m, meter, meters])
  // a "unitary" is a representation of 1 unit of something
}

export interface AccessorLogicalRepresentation<TValue = any> extends BaseLogicalRepresentation {
  type: `accessor`
  display: string
  value: TValue
}

export interface IdentifierLogicalRepresentation extends BaseLogicalRepresentation {
  type: `identifier`
  name: string
}

export interface FunctionLogicalRepresentation extends BaseLogicalRepresentation {
  type: `function`
  name: string
  arguments: LogicalRepresentation[]
}

export interface EnumeratorLogicalRepresentation extends BaseLogicalRepresentation {
  type: `enumerator`
  list: LogicalRepresentation[]
}

export interface ConnectiveLogicalRepresentation extends BaseLogicalRepresentation {
  type: `connective`
  operator: `and` | `or`
  left: LogicalRepresentation
  right: LogicalRepresentation
}

export interface MathematicalLogicalRepresentation extends BaseLogicalRepresentation {
  type: `mathematical`
  operator: `equals` | `greater` | `smaller` | `greater_than` | `smaller_than` | `multiplication` | `division` | `addition` | `subtraction`
  left: LogicalRepresentation
  right: LogicalRepresentation
}

export interface CoditionalLogicalRepresentation extends BaseLogicalRepresentation {
  type: `conditional`
  condition: LogicalRepresentation
  consequent: LogicalRepresentation
  alternative: LogicalRepresentation
}

export type LogicalRepresentation =
  | LiteralLogicalRepresentation
  | AccessorLogicalRepresentation
  | IdentifierLogicalRepresentation
  | FunctionLogicalRepresentation
  | ConnectiveLogicalRepresentation
  | MathematicalLogicalRepresentation
  | EnumeratorLogicalRepresentation
  | CoditionalLogicalRepresentation
  | UnitaryLogicalRepresentation
export type LogicalRepresentationType = LogicalRepresentation[`type`]

export function isLogicalRepresentation<T extends LogicalRepresentationType>(symbol: LogicalRepresentation, type: T): symbol is Extract<LogicalRepresentation, { type: T }> {
  return symbol.type === type
}
