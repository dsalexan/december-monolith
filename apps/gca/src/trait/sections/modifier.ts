import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitModifierSchema = BaseTraitSchema.merge(
  z
    .object({
      group: z.string(),
    })
    .strict(),
)

type schema = typeof TraitModifierSchema
//    ^?

export type TraitModifier = AbstractTrait<`modifiers`, z.infer<typeof TraitModifierSchema>>
