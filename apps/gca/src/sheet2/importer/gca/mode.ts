import { arrayJoin, conditionalSet, isNilOrEmpty } from "@december/utils"
import { Parser, Printer, Syntax, SyntaxNode } from "../../../../../../packages/tree/src"
import { Builder, paint } from "@december/logger"

import { RawTrait, RawTraitMode } from "../../trait/schema"

import { ImportOptions, ImportResult } from "../utils"
import { WarningCluster, nonParsedKeys } from "../warnings"

import { parseGives } from "../../trait/gives"

export function TraitModeImport(attackmode: any, { logger }: ImportOptions<RawTrait>): ImportResult<RawTraitMode> {
  // extract data
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

  // base mode information
  const mode: RawTraitMode = {
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
  }

  const warnings = WarningCluster.from(...nonParsedKeys(attackmode, mode, mode.name))

  logger.add(...paint.grey(paint.italic(`(mode) `), paint.white(`${mode.name}`)), ...paint.yellow(...warnings._inline())).debug() // COMMENT

  // remove unecessary keys
  for (const key of Object.keys(mode)) if (mode[key] === undefined) delete mode[key]

  return { data: mode, warnings }
}
