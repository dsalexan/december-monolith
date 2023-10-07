import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitQuirkSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitQuirk = AbstractTrait<`quirks`, z.infer<typeof TraitQuirkSchema>>
