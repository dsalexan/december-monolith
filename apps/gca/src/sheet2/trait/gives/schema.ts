import { z } from "zod"
import { MathEnabledValueSchema } from "../../core"

/**
 COMPARISON
    IS              TAG and VALUE are the same
    ISNOT           TAG and VALUE are not the same
    INCLUDES        VALUE can be found inside TAG
    EXCLUDES        VALUE is not found inside TAG
    LISTINCLUDES    TAG is treated as a list, and VALUE is found as one of the list items
    LISTEXCLUDES    TAG is treated as a list, and VALUE is not found as one of the list items
*/

/** 
   SUBCRITERIA is an optional refining of the COMPARISON using keywords to limit to what the
    COMPARISON is applied. These keywords are ONEOF, ANYOF, ALLOF, or NONEOF. This allows you to
    specify a list of options to use for the TAG value that satisfy or fail the requirements and allows
    VALUE to be a list of possible options separated by commas (quotes or braces as needed).
*/

export const ComparisonKeywordsSchema = z.enum([
  `Is`, //
  `IsNot`,
  `Includes`,
  `Excludes`,
  `ListIncludes`,
  `ListExcludes`,
])

export const ComparisonSubcriteriaSchema = z.enum([
  `OneOf`, //
  `AnyOf`,
  `AllOf`,
  `NoneOf`,
])

export const ComparisonSchema = z.object({
  operator: ComparisonKeywordsSchema,
  subcriteria: ComparisonSubcriteriaSchema.optional(),
})

// BYMODE [WHERE] TAG COMPARISON [SUBCRITERIA] VALUE

export const ByModeSchema = z.object({
  where: z.boolean().optional(), // the WHERE keyword is optional (it just helps readability to have it there).
  tag: z.unknown(), // mode-enabled
  comparison: ComparisonSchema, // the comparison you're making, and uses the same selection as Trait Selectors
  value: z.unknown().array(),
  // I THINK subcriteria allows VALUE to be a list of possible options separated by commas (quotes or braces as needed).
})

export const GivesSchema = z.object({
  singleBonus: z.boolean().optional(),
  bonus: MathEnabledValueSchema,
  trait: z.string(), // The TRAIT name should be enclosed in quotes if it includes any restricted characters
  byMode: ByModeSchema.optional(),
  maximumValue: z.unknown().optional(), // math-enabled
  alias: z.string().optional(), // special case substitution
})

export type ComparisonKeywords = z.infer<typeof ComparisonKeywordsSchema>
export type ComparisonSubcriteria = z.infer<typeof ComparisonSubcriteriaSchema>
export type Comparison = z.infer<typeof ComparisonSchema>

export type ByMode = z.infer<typeof ByModeSchema>
export type Gives = z.infer<typeof GivesSchema>
