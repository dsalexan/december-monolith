import { MathOperators } from "./math/syntax"

// export type MathSyntaxNames = `math` | `math_operator` | `math_function` | `math_symbol` | `math_constant` | `math_parenthesis` | `math_array`

export type MathSyntaxNames = `math_expression` | `math_operator` | `math_function` | `math_number` | `math_variable`
// math_expression is a "math holder", all mathematical shit MUST be inside one such node

export type MathAsyntaticSyntaxNames = `math_expression` | `math_variable` | `math_number`

export type LogicalSyntaxNames = `logical_if`

type AsyntaticSyntaxTypes = `string` | `list` | `nil` | `math`
type AsyntaticSyntaxNames = `string` | `marker` | `list` | `nil` | MathAsyntaticSyntaxNames

export type EnclosureSyntaxNames = `imaginary` | `parenthesis` | `braces` | `brackets` | `quotes` | `percentages`

export type SeparatorSyntaxNames = `comma` | `pipe` | `colon` | `math_operator`

export type AggregatorSyntaxNames = `math_function` | `directive` | `logic_if`

export type SyntaxType = AsyntaticSyntaxTypes | `enclosure` | `separator` | `aggregator`
export type SyntaxName = AsyntaticSyntaxNames | EnclosureSyntaxNames | SeparatorSyntaxNames | MathSyntaxNames | AggregatorSyntaxNames

type aaaaaa = Exclude<SyntaxType, AsyntaticSyntaxTypes>
//    ^?

export type ComponentBase<TType extends SyntaxType = SyntaxType, TName extends SyntaxName = SyntaxName> = {
  type: TType
  name: TName
  prefix: string
  math: boolean // says if a syntax can act as a math_X synax (i.e. capable of mathematical calculations)
  mathParent?: boolean
  mathGrandparent?: boolean
}

export type AsyntaticComponent = ComponentBase<AsyntaticSyntaxTypes, AsyntaticSyntaxNames>

export type SyntaxComponentBase<
  TType extends Exclude<SyntaxType, AsyntaticSyntaxTypes> = Exclude<SyntaxType, AsyntaticSyntaxTypes>,
  TName extends Exclude<SyntaxName, AsyntaticSyntaxNames> = Exclude<SyntaxName, AsyntaticSyntaxNames>,
> = ComponentBase<TType, TName> & {
  set: string[]
}

export type EnclosureSyntaxComponent = SyntaxComponentBase<`enclosure`, EnclosureSyntaxNames> & {
  opener: string
  closer: string
  separators: string[]
}

export type SeparatorSyntaxComponent = SyntaxComponentBase<`separator`, SeparatorSyntaxNames> & {
  char: string
  parents: SyntaxName[]
  prio: number
  prioBump: Partial<Record<SyntaxName, number>>
}

export type AggregatorSyntaxComponent = SyntaxComponentBase<`aggregator`, AggregatorSyntaxNames> & {
  char: string
  grandparents: SyntaxName[]
  parents: SyntaxName[]
  prio: Record<string, number>
  //
  functionNames: string[]
  patterns: RegExp[]
}

export type SyntaxComponent = AsyntaticComponent | EnclosureSyntaxComponent | SeparatorSyntaxComponent | AggregatorSyntaxComponent
