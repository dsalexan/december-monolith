export interface PrefixOptions {
  noLabel?: boolean
}

export class Prefix {
  name: string
  symbol: string
  factor: number
  //
  noLabel: boolean = false
  //
  protected collection: PrefixCollection
  public setCollection(collection: PrefixCollection) {
    this.collection = collection
  }

  constructor(name: string, symbol: string, factor: number, options: Partial<PrefixOptions> = {}) {
    this.name = name
    this.symbol = symbol
    this.factor = factor
    //
    this.noLabel = options.noLabel ?? false
  }
}

export type PrefixNames = string[]
export type PrefixDictionary = Record<string, Prefix>

export class PrefixCollection {
  prefixes: Map<Prefix[`symbol`], Prefix> = new Map()

  constructor(orderOfPrefixes: PrefixNames, prefixes: PrefixDictionary) {
    for (const prefixName of orderOfPrefixes) {
      const prefix = prefixes[prefixName]
      this.prefixes.set(prefix.symbol, prefix)
      prefix.setCollection(this)
    }
  }
}

// #region SI Prefixes

export const SI_PREFIXES_NAMES = [
  `QUETTA`,
  `RONNA`,
  `YOTTA`,
  `ZETTA`,
  `EXA`,
  `PETA`,
  `TERA`,
  `GIGA`,
  `MEGA`,
  `KILO`,
  `HECTO`,
  `DECA`,
  `BASE`,
  `DECI`,
  `CENTI`,
  `MILLI`,
  `MICRO`,
  `NANO`,
  `PICO`,
  `FEMTO`,
  `ATTO`,
  `ZEPTO`,
  `YOCTO`,
  `RONTO`,
  `QUECTO`,
] as const
export type SIPrefixName = (typeof SI_PREFIXES_NAMES)[number]

export const SI_PREFIXES: Record<SIPrefixName, Prefix> = {
  QUETTA: new Prefix(`quetta`, `Q`, 10 ** 30),
  RONNA: new Prefix(`ronna`, `R`, 10 ** 27),
  YOTTA: new Prefix(`yotta`, `Y`, 10 ** 24),
  ZETTA: new Prefix(`zetta`, `Z`, 10 ** 21),
  EXA: new Prefix(`exa`, `E`, 10 ** 18),
  PETA: new Prefix(`peta`, `P`, 10 ** 15),
  TERA: new Prefix(`tera`, `T`, 10 ** 12),
  GIGA: new Prefix(`giga`, `G`, 10 ** 9),
  MEGA: new Prefix(`mega`, `M`, 10 ** 6),
  KILO: new Prefix(`kilo`, `k`, 10 ** 3),
  HECTO: new Prefix(`hecto`, `h`, 10 ** 2),
  DECA: new Prefix(`deca`, `da`, 10 ** 1),
  BASE: new Prefix(`base`, ``, 10 ** 0, { noLabel: true }),
  DECI: new Prefix(`deci`, `d`, 10 ** -1),
  CENTI: new Prefix(`centi`, `c`, 10 ** -2),
  MILLI: new Prefix(`milli`, `m`, 10 ** -3),
  MICRO: new Prefix(`micro`, `μ`, 10 ** -6),
  NANO: new Prefix(`nano`, `n`, 10 ** -9),
  PICO: new Prefix(`pico`, `p`, 10 ** -12),
  FEMTO: new Prefix(`femto`, `f`, 10 ** -15),
  ATTO: new Prefix(`atto`, `a`, 10 ** -18),
  ZEPTO: new Prefix(`zepto`, `z`, 10 ** -21),
  YOCTO: new Prefix(`yocto`, `y`, 10 ** -24),
  RONTO: new Prefix(`ronto`, `r`, 10 ** -27),
  QUECTO: new Prefix(`quecto`, `q`, 10 ** -30),
}

export const SI_PREFIXES_COLLECTION = new PrefixCollection(SI_PREFIXES_NAMES as any, SI_PREFIXES)

// #endregion
