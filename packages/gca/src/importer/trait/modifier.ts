import { AnyObject } from "tsdef"
import { isNumber } from "lodash"
import assert from "assert"

import { conditionalSet } from "@december/utils"

import churchill, { Builder, paint } from "../../logger"

import { GCATraitModifier } from "../../trait"

export default function importGCATraitModifier(index: number, raw: AnyObject, logger: Builder = churchill): GCATraitModifier {
  // 1. Get complex or assertable values
  const id = parseInt(raw.$.idkey)
  assert(isNumber(id), `Trait Modifier ID is not a number`)

  const name = raw.name?.[0] as string
  const nameext = raw.nameext?.[0] as string

  logger.add(...paint.grey(paint.dim(`[modifiers/`), index, paint.dim(`/`), id, paint.dim(`] `)), paint.blue(`${name} (${nameext})`)).debug() // COMMENT

  // 2. Build object
  const modifier: GCATraitModifier = {
    id,
    name,
    nameext,
  }

  // 3. Parse gives
  conditionalSet(modifier, `gives`, raw.gives?.[0] ?? ``)

  return modifier
}
