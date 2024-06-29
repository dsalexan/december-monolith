import { arrayJoin, conditionalSet, isNilOrEmpty } from "@december/utils"
import { Builder, ILogger, paint } from "@december/logger"

import { RawTrait, RawTraitMode, RawTraitModifier } from "../../trait/schema"

import { has, join } from "lodash"
import { ImportWarning, WarningCluster, nonParsedKeys } from "../warnings"
import { ImportOptions, ImportResult, ListImport } from "../utils"
import { TraitModifierImport } from "./modifier"
import { TraitModeImport } from "./mode"

export default function TraitImport(rawTrait: any, { logger }: ImportOptions<any>): ImportResult<RawTrait> {
  // parse base trait information
  const id = parseInt(rawTrait.$.idkey)

  let points = rawTrait.points?.[0]
  if (points !== undefined) points = parseInt(points)

  let level = rawTrait.level?.[0]
  if (level !== undefined) level = parseInt(level)

  let score = rawTrait.score?.[0]
  if (score !== undefined) score = parseInt(score)

  const _extendedTags = rawTrait.extended?.[0]?.extendedtag ?? []
  const extendedTags = Object.fromEntries(_extendedTags.map((tag: any) => [tag.tagname, tag.tagvalue])) as Record<string, string[]>

  const trait: RawTrait = {
    _: rawTrait,
    id,
    name: rawTrait.name[0].trim(),
    type: rawTrait.$.type,
    active: has(extendedTags, `inactive`) ? extendedTags[`inactive`][0] !== `yes` : true,
    //
    points,
    level,
    score,
  }

  // if (id === 15051) debugger

  const warnings = WarningCluster.from(...nonParsedKeys(rawTrait, trait, trait.name))

  logger.add(...paint.grey(trait.id, `:`, paint.white(trait.name)), ...paint.yellow(...warnings._inline())).debug() // COMMENT

  // parse list stuffs
  logger.tab() // COMMENT
  const { data: modifiers, warnings: modifierWarnings } = ListImport(rawTrait.modifiers?.[0].modifier?.filter(i => i.name[0] !== ``) ?? [], TraitModifierImport, { logger, parent: trait })
  const { data: modes, warnings: modeWarnings } = ListImport(rawTrait.attackmodes?.[0].attackmode?.filter(i => i.name[0] !== ``) ?? [], TraitModeImport, { logger, parent: trait })
  logger.tab(-1) // COMMENT

  // insert information
  trait.modifiers = modifiers
  trait.modes = modes

  // store warnings
  warnings.extract(modifierWarnings).extract(modeWarnings)

  return { data: trait, warnings }
}
