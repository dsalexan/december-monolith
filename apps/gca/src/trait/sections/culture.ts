import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitCultureSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitCulture = AbstractTrait<`cultures`, z.infer<typeof TraitCultureSchema>>
