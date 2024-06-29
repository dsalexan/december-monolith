import { z } from "zod"
import { toTag, TraitSection, TraitSectionsSchema } from "../../../trait/sections/types"
import { DamageTypeSchema } from "../../../damage/type"
import { DamageFormSchema } from "../../../damage/form"
import { isEmpty } from "lodash"
import { Computed } from "@december/compile"

export const RawTraitModeSchema = z.object({
  name: z.string(),
  acc: z.string().optional(),
  damage: z.string().optional(),
  dmg: z.string().optional(),
  damagebasedon: z.string().optional(),
  damtype: z.string().optional(),
  rangehalfdam: z.string().optional(),
  rangemax: z.string().optional(),
  reachbasedon: z.string().optional(),
  rcl: z.string().optional(),
  rof: z.string().optional(),
  skillused: z.string(),
  minimode_damage: z.string().optional(),
  minimode_damtype: z.string().optional(),
})

export const RawTraitModifierSchema = z.object({
  id: z.number(),
  name: z.string(),
  nameext: z.string().optional(),
  gives: z.array(z.string()).optional(),
})

export const RawTraitSchema = z.object({
  _: z.any(), // original value from import
  id: z.number(),
  name: z.string(),
  nameext: z.string().optional(),
  type: z.string(),
  active: z.boolean(),
  //
  points: z.number().optional(),
  level: z.number().optional(),
  score: z.number().optional(),
  //
  modifiers: z.array(RawTraitModifierSchema).optional(),
  modes: z.array(RawTraitModeSchema).optional(),
})

export type RawTraitModifier = z.infer<typeof RawTraitModifierSchema>
export type RawTraitMode = z.infer<typeof RawTraitModeSchema>
export type RawTrait = z.infer<typeof RawTraitSchema>

// =================================================================================================

export const TraitModeSchema = z.object({
  name: z.string(),
  damage: z.object({
    form: DamageFormSchema,
    basedOn: z.string(), // source trait for the damage form base value
    type: Computed.Value.ComputedValueSchema(DamageTypeSchema),
    value: Computed.Value.ComputedValueSchema(z.string()),
  }),
})

export const TraitSchema = z.object({
  id: z.number(),
  name: z.string(),
  nameext: z.string().optional(),
  type: TraitSectionsSchema,
  active: z.boolean(),
  //
  points: z.number(),
  level: z.number(),
  score: z.number().optional(),
  //
  modes: z.array(TraitModeSchema).optional(),
})

export type Trait = z.infer<typeof TraitSchema>

type AAAAAAAAAAAAAA = z.infer<typeof TraitModeSchema>[`damage`][`value`][`get`]
//      ^?

// =================================================================================================

export function isNameExtensionValid(nameext?: string): boolean {
  return !!nameext && !isEmpty(nameext)
}

export function fullName(name: string, nameext?: string): string {
  const hasDistinctFullName = isNameExtensionValid(nameext)

  if (hasDistinctFullName) return `${name} (${nameext})`

  return name
}

export function referenceKeys(type: TraitSection, name: string, nameext?: string): string[] {
  const keys = [] as string[]

  // from name
  const fromName = `${toTag(type)}:${name}`
  keys.push(fromName)

  // from fullname
  if (isNameExtensionValid(nameext)) keys.push(`${toTag(type)}:${fullName(name, nameext)}`)

  return keys
}
