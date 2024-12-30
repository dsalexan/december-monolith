import { isArray, isEmpty, isNil, mergeWith, range, set } from "lodash"
import { isPrimitive } from "./typing"
import { dump } from "./dump"

export * as compare from "./compare"
export * as storage from "./storage"

export { default as Range } from "./range"
export { Interval, Point, RANGE_COMPARISON } from "./range"
export { dump } from "./dump"

export * as Match from "./match"

export function push<TKey extends string | number | symbol = string | number | symbol, TValue = any>(map: Record<TKey, TValue[]>, key: TKey, value: TValue) {
  if (map[key] === undefined) map[key] = []

  map[key].push(value)
}

export function capString(text: string, size: number, ellipsis = `...`, returnAsArray = false) {
  if (text.length <= size) return returnAsArray ? [text] : text

  const components = [text.slice(0, size - ellipsis.length), ellipsis]

  return returnAsArray ? components : components.join(``)
}

export * as typing from "./typing"

export function ranges(numbers: number[]) {
  const ordered = numbers.sort((a, b) => a - b)

  const ranges = [] as [number, number][]

  let currentRange = null as [number, number] | null
  for (let i = 0; i < ordered.length; i++) {
    const number = ordered[i]

    if (currentRange === null) currentRange = [number, number]
    else {
      if (number === currentRange[1] + 1) currentRange[1] = number
      else {
        ranges.push(currentRange)
        currentRange = [number, number]
      }
    }
    // asdasd
  }

  if (currentRange !== null && currentRange.length > 0 && currentRange[0] !== currentRange[1]) ranges.push(currentRange)

  return ranges
}

export function colorNameToHex(color: string) {
  // color list from http://stackoverflow.com/q/1573053/731179  with added gray/gray
  const definedColorNames = {
    aliceblue: `#f0f8ff`,
    antiquewhite: `#faebd7`,
    aqua: `#00ffff`,
    aquamarine: `#7fffd4`,
    azure: `#f0ffff`,
    beige: `#f5f5dc`,
    bisque: `#ffe4c4`,
    black: `#000000`,
    blanchedalmond: `#ffebcd`,
    blue: `#0000ff`,
    blueviolet: `#8a2be2`,
    brown: `#a52a2a`,
    burlywood: `#deb887`,
    cadetblue: `#5f9ea0`,
    chartreuse: `#7fff00`,
    chocolate: `#d2691e`,
    coral: `#ff7f50`,
    cornflowerblue: `#6495ed`,
    cornsilk: `#fff8dc`,
    crimson: `#dc143c`,
    cyan: `#00ffff`,
    darkblue: `#00008b`,
    darkcyan: `#008b8b`,
    darkgoldenrod: `#b8860b`,
    darkgray: `#a9a9a9`,
    darkgreen: `#006400`,
    darkkhaki: `#bdb76b`,
    darkmagenta: `#8b008b`,
    darkolivegreen: `#556b2f`,
    darkorange: `#ff8c00`,
    darkorchid: `#9932cc`,
    darkred: `#8b0000`,
    darksalmon: `#e9967a`,
    darkseagreen: `#8fbc8f`,
    darkslateblue: `#483d8b`,
    darkslategray: `#2f4f4f`,
    darkturquoise: `#00ced1`,
    darkviolet: `#9400d3`,
    deeppink: `#ff1493`,
    deepskyblue: `#00bfff`,
    dimgray: `#696969`,
    dodgerblue: `#1e90ff`,
    firebrick: `#b22222`,
    floralwhite: `#fffaf0`,
    forestgreen: `#228b22`,
    fuchsia: `#ff00ff`,
    gainsboro: `#dcdcdc`,
    ghostwhite: `#f8f8ff`,
    gold: `#ffd700`,
    goldenrod: `#daa520`,
    gray: `#808080`,
    green: `#008000`,
    greenyellow: `#adff2f`,
    honeydew: `#f0fff0`,
    hotpink: `#ff69b4`,
    indianred: `#cd5c5c`,
    indigo: `#4b0082`,
    ivory: `#fffff0`,
    khaki: `#f0e68c`,
    lavender: `#e6e6fa`,
    lavenderblush: `#fff0f5`,
    lawngreen: `#7cfc00`,
    lemonchiffon: `#fffacd`,
    lightblue: `#add8e6`,
    lightcoral: `#f08080`,
    lightcyan: `#e0ffff`,
    lightgoldenrodyellow: `#fafad2`,
    lightgrey: `#d3d3d3`,
    lightgreen: `#90ee90`,
    lightpink: `#ffb6c1`,
    lightsalmon: `#ffa07a`,
    lightseagreen: `#20b2aa`,
    lightskyblue: `#87cefa`,
    lightslategray: `#778899`,
    lightsteelblue: `#b0c4de`,
    lightyellow: `#ffffe0`,
    lime: `#00ff00`,
    limegreen: `#32cd32`,
    linen: `#faf0e6`,
    magenta: `#ff00ff`,
    maroon: `#800000`,
    mediumaquamarine: `#66cdaa`,
    mediumblue: `#0000cd`,
    mediumorchid: `#ba55d3`,
    mediumpurple: `#9370d8`,
    mediumseagreen: `#3cb371`,
    mediumslateblue: `#7b68ee`,
    mediumspringgreen: `#00fa9a`,
    mediumturquoise: `#48d1cc`,
    mediumvioletred: `#c71585`,
    midnightblue: `#191970`,
    mintcream: `#f5fffa`,
    mistyrose: `#ffe4e1`,
    moccasin: `#ffe4b5`,
    navajowhite: `#ffdead`,
    navy: `#000080`,
    oldlace: `#fdf5e6`,
    olive: `#808000`,
    olivedrab: `#6b8e23`,
    orange: `#ffa500`,
    orangered: `#ff4500`,
    orchid: `#da70d6`,
    palegoldenrod: `#eee8aa`,
    palegreen: `#98fb98`,
    paleturquoise: `#afeeee`,
    palevioletred: `#d87093`,
    papayawhip: `#ffefd5`,
    peachpuff: `#ffdab9`,
    peru: `#cd853f`,
    pink: `#ffc0cb`,
    plum: `#dda0dd`,
    powderblue: `#b0e0e6`,
    purple: `#800080`,
    red: `#ff0000`,
    rosybrown: `#bc8f8f`,
    royalblue: `#4169e1`,
    saddlebrown: `#8b4513`,
    salmon: `#fa8072`,
    sandybrown: `#f4a460`,
    seagreen: `#2e8b57`,
    seashell: `#fff5ee`,
    sienna: `#a0522d`,
    silver: `#c0c0c0`,
    skyblue: `#87ceeb`,
    slateblue: `#6a5acd`,
    slategray: `#708090`,
    snow: `#fffafa`,
    springgreen: `#00ff7f`,
    steelblue: `#4682b4`,
    tan: `#d2b48c`,
    teal: `#008080`,
    thistle: `#d8bfd8`,
    tomato: `#ff6347`,
    turquoise: `#40e0d0`,
    violet: `#ee82ee`,
    wheat: `#f5deb3`,
    white: `#ffffff`,
    whitesmoke: `#f5f5f5`,
    yellow: `#ffff00`,
    yellowgreen: `#9acd32`,
    darkgrey: `#a9a9a9`,
    darkslategrey: `#2f4f4f`,
    dimgrey: `#696969`,
    grey: `#808080`,
    lightgray: `#d3d3d3`,
    lightslategrey: `#778899`,
    slategrey: `#708090`,
  } as Record<string, string>

  const hex = definedColorNames[color]
  return hex as string | undefined
}

export function asArray<TValue = unknown>(value: TValue | TValue[]): TValue[] {
  return isArray(value) ? value : [value]
}

export const SUPERSCRIPT_NUMBERS = `⁰¹²³⁴⁵⁶⁷⁸⁹`

export function toSuperscript(number: number) {
  if (number < 0) debugger
  if (!Number.isInteger(number)) debugger

  if (number > 9) {
    const characters = [...number.toString()]
    return characters.map(character => SUPERSCRIPT_NUMBERS[parseInt(character)]).join(``)
  }

  return SUPERSCRIPT_NUMBERS[number]
}

export function fromSuperscript(text: string) {
  if (!Number.isInteger(parseFloat(text))) debugger

  const characters = [...text]
  const numbers = characters.map(character => SUPERSCRIPT_NUMBERS.indexOf(character))

  return parseInt(numbers.join(``))
}

export function isNilOrEmpty(value: any): value is null | undefined | `` {
  return isNil(value) || isEmpty(value)
}

export function arrayJoin(array: any[], separator: any = `, `) {
  return array
    .map(item => [item, separator])
    .flat()
    .slice(0, -1)
}

export function conditionalSet<TObject extends object = object>(object: TObject, key: string | number | symbol, value: any, refuseIf: `nil` | `empty` | `nilOrEmpty` = `nilOrEmpty`) {
  let doSet = true

  if (refuseIf === `nil` && isNil(value)) doSet = false
  else if (refuseIf === `empty` && isEmpty(value)) doSet = false
  else if (refuseIf === `nilOrEmpty` && isNilOrEmpty(value)) doSet = false

  if (doSet) object[key] = value

  //   set(path: PropertyPath, value: any): this;
  //   /**
  //    * @see _.set
  //    */
  //   set<TResult>(path: PropertyPath, value: any): ImpChain<TResult>;
  // }
  // interface LoDashExplicitWrapper<TValue> {
  //   /**
  //    * @see _.set
  //    */
  //   set(path: PropertyPath, value: any): this;
  //   /**
  //    * @see _.set
  //    */
  //   set<TResult>(path: PropertyPath, value: any): ExpChain<TResult>;

  // set<T extends object>(object: T, path: PropertyPath, value: any): T;
  // /**
  //  * @see _.set
  //  */
  // set<TResult>(object: object, path: PropertyPath, value: any): TResult;

  return object
}

export function mergeWithDeep<TObject, TSource>(object: TObject, source: TSource, customizer: (currentValue: any, newValue: any) => unknown): TObject & TSource {
  return mergeWith(object, source, (currentValue, newValue, key, object, source) => {
    // TODO: Implement universal merger in utils
    if (isPrimitive(newValue)) return newValue
    if (currentValue === undefined || currentValue.length === 0) return newValue
    if (currentValue.length === newValue.length) return newValue
    if (isArray(currentValue) && isArray(newValue)) return [...currentValue, ...newValue]

    debugger

    return customizer(currentValue, newValue)
  })
}

export const ALPHABET = [`a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `p`, `q`, `r`, `s`, `t`, `u`, `v`, `w`, `x`, `y`, `z`]

export function numberToLetters(j: number) {
  let i = j % ALPHABET.length
  const f = Math.floor(j / ALPHABET.length)

  return `${range(0, f)
    .map(() => ALPHABET[0])
    .join(``)}${ALPHABET[i]}`
}

export function baseAlphabet(j: number) {
  if (j < 10) return j
  else return numberToLetters(j - 10)
}
