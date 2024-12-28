import assert from "assert"
import { isNil, isNumber, isString, range, sum } from "lodash"
import { Arguments, MaybeUndefined, Nullable } from "tsdef"

/**
 * DICE NOTATION
 *
 * AdXk[hlc]Y
 *
 * A: number of dice
 * X: number of faces
 *
 * kh, kl, kc: keep some dice; h: highest, l: lowest, c: player's choice
 * Y: number of dice to keep
 *
 */

export interface DiceKeep {
  highest?: number
  lowest?: number
  playersChoice?: number
}

export interface DiceData {
  faces: number
  keep?: DiceKeep
}

export interface IDice {
  size: number
  faces: number
  keep?: DiceKeep
}

// #region UTILS

export function areDiceKeepEquals(A: MaybeUndefined<DiceKeep>, B: MaybeUndefined<DiceKeep>) {
  const keys = [`highest`, `lowest`, `playersChoice`] as const
  for (const key of keys) {
    const a = A?.[key] ?? 0
    const b = B?.[key] ?? 0

    if (a !== b) return false
  }

  return true
}

export function parseDiceNotation(notation: string): Nullable<DiceData> {
  if (notation === `d`) {
    return { faces: 6 }
  }

  const match = notation.match(/^(d\d+)(k[hlc]\d+)?(k[hlc]\d+)?(k[hlc]\d+)?$/i)
  if (match) {
    const [_, d, k1, k2, k3] = match
    const keeps = [k1, k2, k3]

    const faces = parseInt(d.slice(1))
    assert(!isNaN(faces), `Faces must be a number`)

    const keep: DiceKeep = {}
    for (const k of keeps) {
      if (k === undefined || k.trim().length === 0) continue

      const FT = k.slice(0, 2).toLocaleLowerCase()
      let mode: keyof DiceKeep
      if (FT === `kh`) mode = `highest`
      else if (FT === `kl`) mode = `lowest`
      else if (FT === `kc`) mode = `playersChoice`
      //
      else throw new Error(`Unimplement dice keep mode "${FT}"`)

      const value = parseInt(k.slice(2))
      assert(!isNaN(value), `Dice keep rule must be a number`)

      keep[mode] = value
    }

    return { faces, keep }
  }

  return null
}

// #endregion
