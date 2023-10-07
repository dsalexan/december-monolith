import { z } from "zod"
import { TraitSectionsSchema } from "./types"

/**
 * Value: String x Input x Selection List
 *        "    "   [   ]   %            %
 *
 * I'm assuming that EVERYTHING can be a combination of strings (primitives actually), input and selection list
 * But I really dont want to deal with implementing this schema
 * So i'll just attribute a symbol for "lazy value", indicating that that tag WAS parsed (but will only yield a value at runtime)
 */

export const TraitModeSchema = z
  .object({
    name: z.string(),
  })
  .strict()

export const BaseTraitSchema = z
  .object({
    name: z.string(),
    nameext: z.string().optional(),
    // fullname: z.string(),
    //
    cat: z.array(z.string()).optional(),
    meta: z.array(z.string()).optional(),
    //
    modes: z.array(TraitModeSchema).optional(),
  })
  .strict()

export type BaseTrait = z.infer<typeof BaseTraitSchema>
//            ^?

export type TraitMode = z.infer<typeof TraitModeSchema>
