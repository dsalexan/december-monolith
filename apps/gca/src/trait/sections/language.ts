import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitLanguageSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitLanguage = AbstractTrait<`languages`, z.infer<typeof TraitLanguageSchema>>
