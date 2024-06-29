import { typing } from "@december/utils"
import { isNil } from "lodash"

export interface UnitPrefixDefinition {
  name: string
  symbol: string
  factor: number
}

export interface UnitConversion {
  to: Unit[`name`]
  factor: number
}

export interface UnitSignature {
  name: string
  symbol: string
}

export class OperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = `OperationError`
  }
}

export class DifferentUnitsError extends OperationError {
  declare name: `DifferentUnitsError`

  constructor() {
    super(`Cannot operate different units`)
    this.name = `DifferentUnitsError`
  }
}
export class UnexpectedTypeError extends OperationError {
  declare name: `UnexpectedTypeError`

  constructor() {
    super(`Some parameter has an exprected type`)
    this.name = `UnexpectedTypeError`
  }
}

export const AlgebraicOperations = [`addition`, `subtraction`, `multiplication`, `division`] as const
export const LogicalOperations = [`and`, `or`] as const
export const EqualityOperations = [`equals`, `greater`, `smaller`, `greater_than`, `smaller_than`] as const
export const Operations = [...AlgebraicOperations, ...LogicalOperations, ...EqualityOperations] as const

export type Operation = (typeof Operations)[number]

export class NumericUnitDecorator implements typing.ITyped {
  __type: { NumericUnitDecorator: true } = { NumericUnitDecorator: true }

  value: number

  unit?: UnitSignature

  constructor(value: number, unit?: { name: string; symbol: string }) {
    this.value = value
    this.unit = unit
  }

  toString() {
    if (!this.unit) return this.value.toString()
    return `${this.value}${this.unit.symbol}`
  }

  static isNumericUnitDecorator(value: unknown): value is NumericUnitDecorator {
    return value instanceof NumericUnitDecorator
  }

  static getUnit(value: unknown) {
    if (NumericUnitDecorator.isNumericUnitDecorator(value)) return value.unit

    return undefined
  }

  static getValue(value: NumericUnitDecorator | typing.Primitive) {
    if (NumericUnitDecorator.isNumericUnitDecorator(value)) return value.value

    return value
  }

  static _operator(name: Operation) {
    switch (name) {
      // ALGEBRAIC
      case `addition`:
        return (a: any, b: any) => a + b
      case `subtraction`:
        return (a: any, b: any) => a - b
      case `multiplication`:
        return (a: any, b: any) => a * b
      case `division`:
        return (a: any, b: any) => a / b
      // LOGICAL
      case `and`:
        return (a: any, b: any) => a && b
      case `or`:
        return (a: any, b: any) => a || b
      // EQUALITY
      case `equals`:
        return (a: any, b: any) => a === b
      //    (inequality)
      case `greater`:
        return (a: any, b: any) => a > b
      case `smaller`:
        return (a: any, b: any) => a < b
      case `greater_than`:
        return (a: any, b: any) => a >= b
      case `smaller_than`:
        return (a: any, b: any) => a <= b
      //
      default:
        debugger
        throw new Error(`Invalid operator`)
    }
  }

  static testOperation(operator: Operation, A: NumericUnitDecorator | typing.Primitive, B: NumericUnitDecorator | typing.Primitive) {
    const someHasUnit = !isNil(NumericUnitDecorator.getUnit(A) || NumericUnitDecorator.getUnit(B))

    if (someHasUnit) {
      const unitsAreDifferent = !Unit.isEqual(NumericUnitDecorator.getUnit(A)!, NumericUnitDecorator.getUnit(B)!)
      if (unitsAreDifferent) return new DifferentUnitsError()
    }

    const AIsNumberLike = typeof A === `number` || NumericUnitDecorator.isNumericUnitDecorator(A)
    const BIsNumberLike = typeof B === `number` || NumericUnitDecorator.isNumericUnitDecorator(B)

    const AIsBoolean = typeof A === `boolean`
    const BIsBoolean = typeof B === `boolean`

    const bothBehaveLikeNumbers = (AIsNumberLike || AIsBoolean) && (BIsNumberLike || BIsBoolean)

    if (!bothBehaveLikeNumbers) return new UnexpectedTypeError()

    return null
  }

  static operation(operator: Operation, A: NumericUnitDecorator | typing.Primitive, B: NumericUnitDecorator | typing.Primitive): NumericUnitDecorator | boolean {
    const fn = NumericUnitDecorator._operator(operator)

    const error = NumericUnitDecorator.testOperation(operator, A, B)
    if (error) throw error

    // if none has unit
    // if both have the same unit
    const result = fn(NumericUnitDecorator.getValue(A), NumericUnitDecorator.getValue(B))
    const unit = NumericUnitDecorator.getUnit(A) || NumericUnitDecorator.getUnit(B)

    // if operator is algebraic
    if (AlgebraicOperations.includes(operator as any)) return new NumericUnitDecorator(result as number, unit)

    // ERROR: Why is this here??
    if (unit) debugger

    // if operator is boolean (be that logical or equality)
    return result as boolean
  }

  operation(operator: Operation, B: NumericUnitDecorator) {
    return NumericUnitDecorator.operation(operator, this, B)
  }
}

export class Unit implements typing.ITyped {
  __type: { __Unit: true } = { __Unit: true }

  name: string
  symbol: string
  alternatives: string[]
  _patterns: RegExp[]
  //
  conversions: UnitConversion[] // first conversion is always "base SI" or something like it (like, for feet is metres)
  meta: {
    prefix?: UnitPrefixDefinition
  } = {}

  get patterns(): RegExp[] {
    const patterns = [
      //
      new RegExp(`^ *${this.symbol} *\\.? *$`, `i`),
      // TODO: Improve plural matching
      new RegExp(`^ *${this.name}[s]? *$`, `i`),
      ...this.alternatives.map(alternative => new RegExp(`^${alternative}[s]?`, `i`)),
    ]

    return [...patterns, ...this._patterns]
  }

  get signature(): UnitSignature {
    return { name: this.name, symbol: this.symbol }
  }

  static isEqual(a: Unit | UnitSignature, b: Unit | UnitSignature) {
    return a?.name === b?.name && a?.symbol === b?.symbol
  }

  static isUnit(value: typing.ITyped): value is Unit {
    return typing.isOfType<Unit>(value, `Unit`)
  }

  isStandard() {
    return this.conversions.length === 0
  }

  base(): UnitConversion | null {
    return this.conversions[0] ?? null
  }

  /** returns a numerical literal WITH its unit */
  decorate(value: number | NumericUnitDecorator) {
    let _value = value as number
    if (NumericUnitDecorator.isNumericUnitDecorator(value)) {
      // compare both units
      // TODO: What to do when decorating a differently united (?) number? Parse?
      if (value.unit && Unit.isEqual(value.unit, this)) debugger

      _value = value.value
    }

    return new NumericUnitDecorator(_value, { name: this.name, symbol: this.symbol })
  }

  constructor(name: string, symbol: string, alternatives: string[] = [], patterns: RegExp[] = [], conversions: UnitConversion[] = []) {
    this.name = name
    this.symbol = symbol
    this.alternatives = alternatives
    this._patterns = patterns
    this.conversions = conversions
  }

  /** Generates a list of prefixed units from a array of definitions */
  preffixes(definitions: UnitPrefixDefinition[]) {
    const units = [] as Unit[]

    for (const definition of definitions) {
      const prefixedUnit = new Unit(
        `${definition.name}${this.name}`,
        `${definition.symbol}${this.symbol}`, //
        this.alternatives.map(alternative => `${definition.name}${alternative}`),
        [],
        [{ to: this.name, factor: definition.factor }],
      )
      prefixedUnit.meta.prefix = definition

      units.push(prefixedUnit)
    }

    return units
  }

  isEqual(unit: Unit | UnitSignature) {
    return Unit.isEqual(this.signature, unit)
  }
}

export class UnitIndex {
  byName: Record<Unit[`name`], Unit> = {}
  bySymbol: Record<Unit[`symbol`], Unit[`name`]> = {}

  byPattern: [RegExp, Unit[`name`]][] = []

  _add(unit: Unit) {
    // ERROR: Unit already exists
    if (this.byName[unit.name]) debugger

    this.byName[unit.name] = unit
    this.bySymbol[unit.symbol] = unit.name

    for (const pattern of unit.patterns) this.byPattern.push([pattern, unit.name])
  }

  add(...units: Unit[]) {
    for (const unit of units) this._add(unit)
  }

  _match(symbol: string): Unit[`name`] | undefined {
    // TODO: this is, FOR SURE, not optimal
    for (const [pattern, name] of this.byPattern) {
      if (pattern.test(symbol)) return name
    }

    return undefined
  }

  match(symbol: string): Unit | null {
    const name = this._match(symbol)
    const unit = this.byName[name!]

    return unit ?? null
  }
}

// #region DEFAULT UNITS

// export const SI_PREFIXES: UnitPrefixDefinition[] = [
//   { name: `quetta`, symbol: `Q`, factor: 1e30 },
//   { name: `ronna`, symbol: `R`, factor: 1e27 },
//   { name: `yotta`, symbol: `Y`, factor: 1e24 },
//   { name: `zetta`, symbol: `Z`, factor: 1e21 },
//   { name: `exa`, symbol: `E`, factor: 1e18 },
//   { name: `peta`, symbol: `P`, factor: 1e15 },
//   { name: `tera`, symbol: `T`, factor: 1e12 },
//   { name: `giga`, symbol: `G`, factor: 1e9 },
//   { name: `mega`, symbol: `M`, factor: 1e6 },
//   { name: `kilo`, symbol: `k`, factor: 1e3 },
//   { name: `hecto`, symbol: `h`, factor: 1e2 },
//   { name: `deca`, symbol: `da`, factor: 10 },
//   { name: `deci`, symbol: `d`, factor: 0.1 },
//   { name: `centi`, symbol: `c`, factor: 0.01 },
//   { name: `milli`, symbol: `m`, factor: 0.001 },
//   { name: `micro`, symbol: `μ`, factor: 1e-6 },
//   { name: `nano`, symbol: `n`, factor: 1e-9 },
//   { name: `pico`, symbol: `p`, factor: 1e-12 },
//   { name: `femto`, symbol: `f`, factor: 1e-15 },
//   { name: `atto`, symbol: `a`, factor: 1e-18 },
//   { name: `zepto`, symbol: `z`, factor: 1e-21 },
//   { name: `yocto`, symbol: `y`, factor: 1e-24 },
//   { name: `ronto`, symbol: `r`, factor: 1e-27 },
//   { name: `quecto`, symbol: `q`, factor: 1e-30 },
// ]

// export const METRE = new Unit(`metre`, `m`, [`meter`])
// export const METRIC_SYSTEM = Object.fromEntries(METRE.preffixes(SI_PREFIXES).map(unit => [unit.meta.prefix!.name, unit]))

export const DICE = new Unit(`dice`, `d`, [])

// #endregion

export const DEFAULT_UNITS: Unit[] = [
  // METRE,
  // ...Object.values(METRIC_SYSTEM),
  //
  DICE,
]

export default function createUnitIndex() {
  const index = new UnitIndex()
  index.add(...DEFAULT_UNITS)

  return index
}
