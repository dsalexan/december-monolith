import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitFeatureSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitFeature = AbstractTrait<`features`, z.infer<typeof TraitFeatureSchema>>
