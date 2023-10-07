import { LOGIC_SYNTAX_COMPONENTS, MATH_FUNCTIONS } from "./logic"
import { makeSyntaticComponent } from "./component"
import { AggregatorSyntaxComponent, AsyntaticComponent, EnclosureSyntaxComponent, SeparatorSyntaxComponent, SyntaxComponent, SyntaxName } from "./types"
import { MATH_SYNTAX_COMPONENTS } from "./math"
import { DIRECTIVES } from "./directive"

export type { SyntaxComponent } from "./types"
export type { SyntaxName } from "./types"
export type { SyntaxType } from "./types"
export type { EnclosureSyntaxComponent } from "./types"
export type { SeparatorSyntaxComponent } from "./types"
export type { SyntaxComponentBase } from "./types"

export { makeSyntaticComponent } from "./component"

export const SYNTAX_COMPONENTS = {
  nil: makeSyntaticComponent<AsyntaticComponent>(`nil`, `nil`, `⌀`, []),
  list: makeSyntaticComponent<AsyntaticComponent>(`list`, `list`, `l`, [], { mathParent: true }),
  string: makeSyntaticComponent<AsyntaticComponent>(`string`, `string`, `x`, [], { math: true }),
  marker: makeSyntaticComponent<AsyntaticComponent>(`string`, `marker`, `m`, [`@`, `#`], { prio: 1 }),
  //
  imaginary: makeSyntaticComponent<EnclosureSyntaxComponent>(`enclosure`, `imaginary`, `ι`, [`⟨`, `⟩`], { mathParent: true }),
  parenthesis: makeSyntaticComponent<EnclosureSyntaxComponent>(`enclosure`, `parenthesis`, `ρ`, [`(`, `)`], { mathParent: true, math: true }),
  braces: makeSyntaticComponent<EnclosureSyntaxComponent>(`enclosure`, `braces`, `γ`, [`{`, `}`]),
  brackets: makeSyntaticComponent<EnclosureSyntaxComponent>(`enclosure`, `brackets`, `β`, [`[`, `]`]),
  quotes: makeSyntaticComponent<EnclosureSyntaxComponent>(`enclosure`, `quotes`, `κ`, [`"`, `"`], { math: true }),
  percentages: makeSyntaticComponent<EnclosureSyntaxComponent>(`enclosure`, `percentages`, `φ`, [`%`, `%`]),
  //
  comma: makeSyntaticComponent<SeparatorSyntaxComponent>(`separator`, `comma`, `C`, [`,`], {
    mathGrandparent: true,
    parents: [`imaginary`, `parenthesis`, `braces`, `brackets`],
    prio: 2,
    prioBump: { imaginary: Infinity },
  }),
  pipe: makeSyntaticComponent<SeparatorSyntaxComponent>(`separator`, `pipe`, `P`, [`|`], {
    mathGrandparent: true,
    parents: [`imaginary`, `parenthesis`, `braces`, `brackets`],
    prio: 4,
  }),
  colon: makeSyntaticComponent<SeparatorSyntaxComponent>(`separator`, `colon`, `N`, [`:`], {
    mathGrandparent: true,
    parents: [`imaginary`, `parenthesis`, `braces`, `brackets`],
    prio: 3,
  }),
  //
  directive: makeSyntaticComponent<AggregatorSyntaxComponent>(`aggregator`, `directive`, `#`, [], {}),
  //mathParent: true,
  ...MATH_SYNTAX_COMPONENTS,
  ...LOGIC_SYNTAX_COMPONENTS,
} as Record<SyntaxName, SyntaxComponent>

export const DEFAULT_SYNTAX_COMPONENTS = ([`string`, `marker`, `list`, `nil`, `imaginary`, `parenthesis`, `braces`, `brackets`, `quotes`, `comma`, `pipe`] as SyntaxName[]).map(
  name => SYNTAX_COMPONENTS[name],
)

export const RECOGNIZED_FUNCTIONS = {
  "#": DIRECTIVES,
  "@": MATH_FUNCTIONS,
} as Record<string, string[]>
