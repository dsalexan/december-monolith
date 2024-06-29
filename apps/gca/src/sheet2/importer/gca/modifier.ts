import { arrayJoin, conditionalSet, isNilOrEmpty } from "@december/utils"
import { Parser, Printer, Syntax, SyntaxNode } from "@december/tree"
import { Builder, paint } from "@december/logger"

import { RawTrait, RawTraitModifier } from "../../trait/schema"

import { ImportOptions, ImportResult } from "../utils"
import { WarningCluster, nonParsedKeys } from "../warnings"

import { parseGives } from "../../trait/gives"

export function TraitModifierImport(rawModifier: any, { logger }: ImportOptions<RawTrait>): ImportResult<RawTraitModifier> {
  // parse base modifier information
  const id = parseInt(rawModifier.$.idkey)

  const name = rawModifier.name?.[0] as string
  const nameext = rawModifier.nameext?.[0] as string

  const modifier: RawTraitModifier = {
    id,
    name,
    nameext,
  }

  // const gives = parseGives(_gives)
  conditionalSet(modifier, `gives`, rawModifier.gives?.[0] ?? ``)

  const warnings = WarningCluster.from(...nonParsedKeys(rawModifier, modifier, modifier.name))

  logger.add(...paint.grey(paint.italic(`(modifier) `), `${modifier.id}:`, paint.white(`${modifier.name}`)), ...paint.yellow(...warnings._inline())).debug() // COMMENT

  // remove unecessary keys
  for (const key of Object.keys(modifier)) if (modifier[key] === undefined) delete modifier[key]

  return { data: modifier, warnings }
}
