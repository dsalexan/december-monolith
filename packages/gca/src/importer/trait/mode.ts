import { AnyObject } from "tsdef"
import { isNumber } from "lodash"
import assert from "assert"

import churchill, { Builder, paint } from "../../logger"

import { GCATraitMode } from "../../trait"

export default function importGCATraitMode(index: number, attackmode: AnyObject, logger: Builder = churchill): GCATraitMode {
  // 1. Extract data
  const name = attackmode.name?.[0] as string
  const reachbasedon = attackmode.reachbasedon?.[0] as string
  const acc = attackmode.acc?.[0] as string
  const damage = attackmode.damage?.[0] as string
  const dmg = attackmode.dmg?.[0] as string
  const damagebasedon = attackmode.damagebasedon?.[0] as string
  const damtype = attackmode.damtype?.[0] as string
  const rangehalfdam = attackmode.rangehalfdam?.[0] as string
  const rangemax = attackmode.rangemax?.[0] as string
  const rcl = attackmode.rcl?.[0] as string
  const rof = attackmode.rof?.[0] as string
  const skillused = attackmode.skillused?.[0] as string
  const minimode_damage = attackmode.minimode_damage?.[0] as string
  const minimode_damtype = attackmode.minimode_damtype?.[0] as string
  const minst = attackmode.minst?.[0] as string

  logger.add(...paint.grey(paint.dim(`[modes/`), `${index}`, paint.dim(`] `)), paint.green(`${name}`)).debug() // COMMENT

  // if (name === `Barbed-head`) debugger

  // 2. Build object
  const mode: GCATraitMode = {
    name,
    reachbasedon,
    acc,
    damage,
    damagebasedon,
    dmg,
    damtype,
    rangehalfdam,
    rangemax,
    rcl,
    rof,
    skillused,
    minimode_damage,
    minimode_damtype,
    minst,
  }

  return mode
}
