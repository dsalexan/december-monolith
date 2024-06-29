import { cloneDeep, isString } from "lodash"
import { makeSyntaxRestriction, SyntaxRestriction } from "./restriction"
import { all, allAndNotEmpty, makeResolveSyntaxRestriction, none, noneAndNotEmpty, some } from "./restriction/reorganize"
import { Syntax, SyntaxOptions, SyntaxReference, SyntaxSymbol, SyntaxSymbolOptions, SyntaxSymbolPattern, SyntaxTypeSet, Type } from "./syntax"
import { SyntaxName } from "./manager"

interface ExtractChildrenTokenUnfoldProtocol {
  target: -1 | 1 // before | after
  type: `extract_children`
}

interface NewSymbolTokenUnfoldProtocol {
  target: -1 | 1 // before | after
  type: `derive_with_new_symbol`
  value: string
}

interface SymbolTokenUnfoldProtocol {
  target: -1 | 1 // before | after
  type: `derive_with_self_symbol`
}

export type TokenUnfoldProtocol = ExtractChildrenTokenUnfoldProtocol | SymbolTokenUnfoldProtocol | NewSymbolTokenUnfoldProtocol

/**
 * Cluster Protocol
 *
 *    How to cluster child nodes?
 *        all non-syntax
 *        by relative index (relative to matching syntax node???)
 *    Should interceed a new node in between?
 *        (default) No, keep everything in place (as child of parent node)
 *        create a new master node and make all children of that node
 *
 * */

export type ClusterProtocol_NodeCriteria = `non_syntax` | `relative_index`
export type ClusterProtocol_MasterNode = `master_as_only_child`
export type ClusterProtocol = ClusterProtocol_NodeCriteria | ClusterProtocol_MasterNode

export interface KeepProtocol {
  type: `keep`
  target: `self`
}

export interface FoldProtocol {
  type: `fold`
  target: [number, number] // relative index range
  alias?: SyntaxReference<SyntaxName> | string // syntax OR symbol key to fold under (syntax is kept the same as matching if no syntax is offered) (if undefined, uses the same symbol of match)
}

export interface UnfoldProtocol {
  type: `unfold`
  target: [number, number] // relative index range
}

export interface RenameProtocol {
  type: `rename`
  target: [number, number] // relative index range
  as: string // symbol key to update target's syntax to (will update target's SYNTAX to same as itself and SYMBOL to "as")
}

/** Will flat target range as single string (and rename too if necessary) */
export interface ReparseProtocol {
  type: `reparse`
  target: [number, number] // relative index range
  depth: number // depth of target range to act on (0, the targets itself; 1, targets' children; 2, targets' children's children; etc.)
  rename?: string // symbol key to update target's syntax to (will update target's SYNTAX to same as itself and SYMBOL to "as")
}

// Fold some children (or all) under a new master node
export interface MasterProtocol {
  type: `master`
  /**
   * all: all children
   * syntax: all children that match the syntax (NOTE: ?????)
   * affected: all children that are affected by the protocol
   */
  target: `all` | `syntax` | `affected`
}

export type PatternReorganizeProtocol = KeepProtocol | FoldProtocol | UnfoldProtocol | RenameProtocol | MasterProtocol | ReparseProtocol

const BEFORE = [-Infinity, -1] as [number, number]
const AFTER = [1, Infinity] as [number, number]
const PREVIOUS = [-1, -1] as [number, number]
const NEXT = [1, 1] as [number, number]
const SELF = [0, 0] as [number, number]

function protocol<TProtocol extends PatternReorganizeProtocol>(
  type: TProtocol[`type`],
  target?: TProtocol[`target`],
  { alias, as, depth, rename }: Partial<{ alias: FoldProtocol[`alias`]; as: RenameProtocol[`as`]; depth: ReparseProtocol[`depth`]; rename: ReparseProtocol[`rename`] }> = {},
): TProtocol {
  const protocol = { type, target } as TProtocol

  if (alias) (protocol as FoldProtocol).alias = alias
  if (as) (protocol as RenameProtocol).as = as
  if (depth) (protocol as ReparseProtocol).depth = depth
  if (rename) (protocol as ReparseProtocol).rename = rename

  return protocol
}

function keep() {
  return protocol(`keep`, `self`)
}

function fold(target: FoldProtocol[`target`], alias?: FoldProtocol[`alias`]): FoldProtocol {
  return protocol(`fold`, target, { alias })
}

function unfold(target: UnfoldProtocol[`target`]): UnfoldProtocol {
  return protocol(`unfold`, target)
}

function rename(target: RenameProtocol[`target`], as: RenameProtocol[`as`]): RenameProtocol {
  return protocol(`rename`, target, { as })
}

function reparse(target: ReparseProtocol[`target`], depth: number, rename?: string): ReparseProtocol {
  return protocol(`reparse`, target, { depth, rename })
}

function master(target: MasterProtocol[`target`]): MasterProtocol {
  return protocol(`master`, target)
}

const PatternReorganizeProtocolOrder = [`keep`, `reparse`, `rename`, `fold`, `unfold`, `master`] as const

interface PatternTokenOptions extends SyntaxSymbolOptions {
  optional: boolean
  // how to transform the node before/after the node itself
  before: Omit<TokenUnfoldProtocol, `target`> | string | true
  after: Omit<TokenUnfoldProtocol, `target`> | string | true
  //
  cluster: ClusterProtocol[]
  protocols: PatternReorganizeProtocol[]
  priority: number
}

export interface PatternToken extends SyntaxSymbol<SyntaxSymbolPattern> {
  key: string
  //
  optional?: boolean
  protocol1s: {
    cluster: ClusterProtocol[]
    // indicates if all nodes before/after the node itself should "become" a node of specific symbol
    //    if neither, do nothing just keep node as is
    //    if something, kill node after converting after/before to specification
    unfold: TokenUnfoldProtocol[]
  }
  protocols: PatternReorganizeProtocol[]
}

function pt(key: string, patterns: SyntaxSymbolPattern | SyntaxSymbolPattern[], options: Partial<PatternTokenOptions> = {}): PatternToken {
  const patternToken = new SyntaxSymbol(key, patterns, options) as PatternToken

  // optional
  if (options.optional) patternToken.optional = options.optional

  // protocols
  patternToken.protocols = options.protocols ?? []
  if (patternToken.protocols.length === 0) patternToken.protocols.push(keep())

  //    pre-sort protocols
  const unorderedProtocols = patternToken.protocols.filter(protocol => PatternReorganizeProtocolOrder.findIndex(p => p === protocol.type) === -1)
  // ERROR: Protocol type has no defined order
  if (unorderedProtocols.length > 0) debugger

  patternToken.protocols.sort((a, b) => PatternReorganizeProtocolOrder.indexOf(a.type) - PatternReorganizeProtocolOrder.indexOf(b.type))

  return patternToken
}

/** Function to generate a syntax with symbol as SyntaxSymbolPattern */
function syntax(syntax: SyntaxName, symbol?: string): SyntaxReference<SyntaxName> {
  const o = { syntax } as { syntax: SyntaxName; symbol?: string }

  if (symbol) o.symbol = symbol

  return o
}

/** Function to generate a syntax group under a type */
function type(type: Type, ...syntaxes: (SyntaxName | SyntaxReference)[]): SyntaxTypeSet<SyntaxName>
function type(type: Type, rule: SyntaxTypeSet[`rule`], ...syntaxes: (SyntaxName | SyntaxReference)[]): SyntaxTypeSet<SyntaxName>
function type(type: Type, ...syntaxesOrRule: (SyntaxTypeSet[`rule`] | SyntaxName | SyntaxReference)[]) {
  /**
   * If no syntaxes are informed, use "any" rule (which is basically just matching the type)
   * If some syntaxes is informed, use "at least one" rule
   * "none" rule should be explicitly informed
   */
  const _syntaxes = cloneDeep(syntaxesOrRule) as (SyntaxName | SyntaxReference<SyntaxName>)[]
  const rule = [`any`, `at_least_one`, `none`].includes(syntaxesOrRule[0] as string) ? (_syntaxes.shift() as SyntaxTypeSet[`rule`]) : syntaxesOrRule.length > 0 ? `at_least_one` : `any`

  const group = { type, rule, syntaxes: [] } as SyntaxTypeSet<SyntaxName>

  for (const syntax of _syntaxes) {
    const _syntax = (typeof syntax === `string` ? { syntax } : syntax) as SyntaxReference<SyntaxName>

    group.syntaxes.push(_syntax)
  }

  return group
}

/** Function to generate a tags list as a SyntaxSymbolPattern */
function tags(...tags: string[]) {
  return { tags }
}

interface PrintingPlan {
  matchingSequence: string[] // symbol key[]
  template: (number | string)[]
  optional: boolean
  parent?: { mandatory: boolean; syntax: string[] }
}

export interface PatternSyntaxOptions extends SyntaxOptions {
  protocols: PatternReorganizeProtocol[]
}

export class PatternSyntax extends Syntax<SyntaxSymbolPattern> {
  _listOfPatterns: PatternToken[]
  _indexOfPatterns: Record<PatternToken[`key`], PatternToken>
  _printingPlans: PrintingPlan[]

  // a syntax can also have overarching rules for how to reorganize the tree
  protocols: PatternReorganizeProtocol[]

  constructor(name: string, prefix: string, patternTokens: PatternToken[], options?: Partial<PatternSyntaxOptions>) {
    super(`pattern`, name, prefix, options)

    this.protocols = options?.protocols ?? []
    this.setPatterns(patternTokens)
  }

  get patterns() {
    return this._indexOfPatterns
  }

  setPatterns(patternTokens: PatternToken[]) {
    const self = this

    // index symbols
    this.symbols = patternTokens

    // save different access strategies for patterns
    this._listOfPatterns = [...patternTokens]
    this._indexOfPatterns = patternTokens.reduce((acc, patternToken) => ({ ...acc, [patternToken.key]: patternToken }), {}) as Record<PatternToken[`key`], PatternToken>

    // create a plan for HOW to print the node (literally display the node as a string, with all its children)
    // TODO: Make this work. It currently does not.
    this._printingPlans = [] as PrintingPlan[]
    for (const { key, optional, protocols } of patternTokens) {
      const plan = {
        matchingSequence: [key],
        template: [0],
        optional: !!optional,
      } as PrintingPlan

      // fold protocols matter in printing
      //    matters because it "hides" the original matched token (so we must re-add it in print)
      const foldProtocols = protocols.filter(protocol => protocol.type === `fold`) as FoldProtocol[]
      if (foldProtocols.length > 0) {
        plan.matchingSequence = []
        plan.template = [key]

        for (const protocol of foldProtocols) {
          // add reference in proper place
          const method = protocol.target[0] < 0 ? `unshift` : `push`
          plan.template[method](plan.matchingSequence.length)

          // what text to re-add
          const _symbol = !protocol.alias ? key : typeof protocol.alias === `string` ? protocol.alias : protocol.alias.symbol ?? key // NOTE: wut
          plan.matchingSequence.push(_symbol)
        }
      }

      this._printingPlans.push(plan)
    }
  }
}

// export const MULTIPLICATION = new SeparatorSyntax(`multiplication`, `×`, `*`, { priority: 10010, binary: true })
export const IMPLICIT_MULTIPLICATION = new PatternSyntax(
  `implicit_multiplication`,
  `_×`,
  [
    // number OR any type:enclosure
    pt(`left`, [syntax(`number`), type(`enclosure`)], { protocols: [fold(SELF, { syntax: `list` }), fold(NEXT, { syntax: `list` }), master(`affected`)], restrictions: { next_sibling: [allAndNotEmpty(`string`)] }, tags: [`math`] }),
  ],
  {
    priority: 10006,
    tags: [`math`, `default_value:empty`],
  },
)

// GIVES([=] BONUS TO TRAIT[::TAGNAME ] [BYMODE [WHERE] TAG COMPARISON VALUE] [ UPTO LIMIT ][ LISTAS “BONUS TEXT” ])
//      [=] bonus TO trait::tagname [BYMODE [WHERE] tag COMPARASON value] [UPTO LIMIT] [LISTAS "text"]

/**
 * singleBonus -> singleBonus
 * to.before -> bonus
 * to.after -> trait
 * byMode.after -> byMode
 * upto.after -> upto
 * listas.after -> listas
 */

export const GIVES = new PatternSyntax(
  `gives`,
  `gvs`,
  [
    // pt(`singleBonus`, `=`, { cluster: [`non_syntax`, `master_as_only_child`], optional: true }), //
    // pt(`to`, /^(to)$/i, { cluster: [`non_syntax`, `master_as_only_child`], before: `bonus`, after: `trait` }),
    // pt(`ByMode`, /^(bymode)$/i, { cluster: [`non_syntax`, `master_as_only_child`], optional: true, after: true }),
    // pt(`where`, /^(where)$/i, { cluster: [`non_syntax`, `master_as_only_child`], optional: true, after: true }),
    // pt(`UpTo`, /^(upto)$/i, { cluster: [`non_syntax`, `master_as_only_child`], optional: true, after: true }),
    // pt(`ListAs`, /^(listas)$/i, { cluster: [`non_syntax`, `master_as_only_child`], optional: true, after: true }),
    pt(`singleBonus`, `=`, { optional: true }), //
    pt(`to`, /^(to)$/i, { protocols: [fold(BEFORE, `bonus`), fold(AFTER, `trait`)] }),
    pt(`ByMode`, /^(bymode)$/i, { protocols: [fold(AFTER)], optional: true }),
    pt(`where`, /^(where)$/i, { protocols: [fold(AFTER)], optional: true }),
    pt(`UpTo`, /^(upto)$/i, { protocols: [fold(AFTER)], optional: true }),
    pt(`ListAs`, /^(listas)$/i, { protocols: [fold(AFTER)], optional: true }),
  ],
  {
    protocols: [master(`all`)],
    priority: 100,
  },
)

// $IF(condition THEN consequent ELSE alternative)
export const IF = new PatternSyntax(
  `if`, //
  `if`,
  [
    // pt(`if`, /^(\$if)$/i, { protocols: [unfold(NEXT), master(`affected`)], restrictions: { next_sibling: [makeSyntaxRestriction(`reorganize`, `all`, `parenthesis`)] }, priority: -1 }), //
    // pt(`then`, /^(then)$/i, { protocols: [fold(BEFORE, `condition`), fold(AFTER)], restrictions: { parent: [makeSyntaxRestriction(`reorganize`, `some`, `parenthesis`)] } }),
    // pt(`else`, /^(else)$/i, { protocols: [fold(AFTER)], restrictions: { parent: [makeSyntaxRestriction(`reorganize`, `some`, `parenthesis`)] } }),
    pt(`if`, /^([\$@]if)$/i, { protocols: [unfold(NEXT), master(`affected`)], restrictions: { next_sibling: [all(`parenthesis`)] }, priority: -1 }), //
    pt(`then`, /^(then)$/i, { protocols: [fold(BEFORE, `condition`), fold(AFTER)], restrictions: { parent: [some(`parenthesis`)] } }),
    pt(`else`, /^(else)$/i, { protocols: [fold(AFTER)], restrictions: { parent: [some(`parenthesis`)] } }),
  ],

  { priority: 100, tags: [`math`, `accepts_logical`] },
)

// @<FUNCTION NAME>(<ARGUMENTS>)
export const FUNCTION = new PatternSyntax(
  `function`, //
  `f`,
  [
    //
    pt(`name`, /^([@][\w_]+)$/i, { protocols: [keep(), rename(NEXT, `arguments`), master(`affected`)], restrictions: { next_sibling: [all(`parenthesis`)] }, tags: [`deep_primitive`] }),
  ],
  { priority: 110, tags: [`math`] },
)

// $<TEXT FUNCTION NAME>(<EXPRESSION>)
//    Re-parses (TODO: maybe even re-interprets) a expression with different workers
export const EVAL = new PatternSyntax(
  `eval`, //
  `e`,
  [
    //
    pt(`name`, /^(\$(?:eval|evaluate|solver))$/i, { protocols: [keep(), reparse(NEXT, 1, `expression`), master(`affected`)], restrictions: { next_sibling: [all(`parenthesis`)] }, tags: [`deep_primitive`] }),
  ],
  { priority: 105, tags: [`math`, `accepts_logical`] },
)

// <OBJECT>::<MEMBER>
// "[...<PRIMITIVE>]::<MEMBER>""
export const INVOKER = new PatternSyntax(
  `invoker`, //
  `::`,
  [
    pt(`::`, /(::)/g, { protocols: [fold(PREVIOUS, `object`), fold(NEXT, `member`), master(`affected`)], restrictions: { previous_sibling: [noneAndNotEmpty(`whitespace`)], next_sibling: [none(`whitespace`)] } }),
    pt(`κ::`, /(::)/g, {
      protocols: [fold(BEFORE, `object`), fold(NEXT, `member`), master(`affected`)],
      restrictions: { parent: [makeResolveSyntaxRestriction({ oneToManyOperation: `all` }, `quotes`)], next_sibling: [none(`whitespace`)] },
      priority: -1,
    }),
  ],
  {
    priority: 100005,
    tags: [`math`],
  },
)

// export const COMMA = new PatternSyntax(`comma`, `C`, `,`, { priority: 100 })
// export const COLON = new PatternSyntax(`colon`, `N`, `:`, { priority: 99 })
// export const PIPE = new PatternSyntax(`pipe`, `P`, `|`, { priority: 98 })

// WARN: Always update this list when adding a new syntax
export const SYNTAXES = [GIVES, IF, FUNCTION, EVAL, INVOKER, IMPLICIT_MULTIPLICATION]
export const SYNTAXES_BY_NAME = SYNTAXES.reduce((acc, syntax) => ({ ...acc, [syntax.name]: syntax }), {})

export const DEFAULT_SYNTAX_NAMES = [`gives`, `if`, `function`, `eval`, `invoker`] as const
export const PATTERN_MATH_SYNTAX_NAMES = [`implicit_multiplication`] as const

// WARN: Always update this list when adding a new recipe
export const SYNTAX_NAMES = [`gives`, `if`, `function`, `eval`, `invoker`, ...PATTERN_MATH_SYNTAX_NAMES] as const
export type PatternSyntaxName = (typeof SYNTAX_NAMES)[number]
