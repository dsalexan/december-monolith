import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitTemplateSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitTemplate = AbstractTrait<`templates`, z.infer<typeof TraitTemplateSchema>>
