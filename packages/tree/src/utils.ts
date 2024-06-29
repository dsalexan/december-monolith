import { range } from "lodash"

export const ALPHABET = [`a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `p`, `q`, `r`, `s`, `t`, `u`, `v`, `w`, `x`, `y`, `z`]

export function numberToLetters(j: number) {
  let i = j % ALPHABET.length
  const f = Math.floor(j / ALPHABET.length)

  return `${range(0, f)
    .map(() => ALPHABET[0])
    .join(``)}${ALPHABET[i]}`
}
