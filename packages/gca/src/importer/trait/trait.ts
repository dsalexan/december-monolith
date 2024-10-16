import { AnyObject, MaybeUndefined } from "tsdef"
import assert from "assert"
import { has, isNumber } from "lodash"

import { conditionalSet } from "@december/utils"

import churchill, { Builder, paint } from "../../logger"

import { GCATrait } from "../../trait"
import { TRAIT_SECTIONS, TraitSection } from "../../trait/section"
import importGCATraitModifier from "./modifier"
import importGCATraitMode from "./mode"

function parseInt(value: MaybeUndefined<string>): MaybeUndefined<number> {
  if (value === undefined) return value
  return Number.parseInt(value)
}

export default function importGCATrait(superType: `trait` | `attribute`, raw: AnyObject, logger: Builder = churchill): GCATrait {
  // 1. Get complex or assertable values
  const id = parseInt(raw.$.idkey)
  assert(isNumber(id), `Trait ID is not a number`)

  const name = raw.name[0].trim() as string

  logger.add(...paint.grey(paint.dim(`[${superType}s/`), id, paint.dim(`] `)), paint.white(name)).debug() // COMMENT

  const _extendedTags = raw.extended?.[0]?.extendedtag ?? []
  const extendedTags = Object.fromEntries(_extendedTags.map((tag: any) => [tag.tagname, tag.tagvalue])) as Record<string, string[]>

  const section: TraitSection = raw.$.type.toLowerCase() as TraitSection
  assert(TRAIT_SECTIONS.includes(section), `Trait section "${section}" is not valid`)

  // 2. Build trait
  const trait: GCATrait = {
    id,
    name,
    section,
    active: has(extendedTags, `inactive`) ? extendedTags[`inactive`][0] !== `yes` : true,
    attribute: superType === `attribute`,
    //
    points: parseInt(raw.points?.[0]),
    level: parseInt(raw.level?.[0]),
    score: parseInt(raw.score?.[0]),
  }

  // 3. Parse deep objects
  const _modifiers = raw.modifiers?.[0].modifier?.filter(i => i.name[0] !== ``)
  const _modes = raw.attackmodes?.[0].attackmode?.filter(i => i.name[0] !== ``)

  logger.tab() // COMMENT
  if (_modifiers) trait.modifiers = _modifiers.map((m, i) => importGCATraitModifier(i, m, logger))
  if (_modes) trait.modes = _modes.map((m, i) => importGCATraitMode(i, m, logger))
  logger.untab() // COMMENT

  return trait
}
