import assert from "assert"

import { isNilOrEmpty } from "@december/utils"
import { camelCase, isNil } from "lodash"

/**
 * COMPARISON is the comparison you're making, and uses the same selection as Trait Selectors, which are these:
 *  IS            TAG and VALUE are not the same
 *  ISNOT         TAG and VALUE are the same
 *  INCLUDES      VALUE is not found inside TAG
 *    CONTAINS      (a.k.a. includes)
 *  EXCLUDES      VALUE can be found inside TAG
 *  LISTINCLUDES  TAG is treated as a list, and VALUE is found as one of the list items
 *  LISTEXCLUDES  TAG is treated as a list, and VALUE is not found as one of the list items
 */

export const TRAIT_SELECTOR = [`Is`, `IsNot`, `Includes`, `Contains`, `Excludes`, `ListIncludes`, `ListExcludes`] as const
export type TraitSelector = (typeof TRAIT_SELECTOR)[number]

export const TRAIT_SELECTOR_SUBCRITERIA = [`OneOf`, `AnyOf`, `AllOf`, `NoneOf`] as const
export type TraitSelectorSubcriteria = (typeof TRAIT_SELECTOR_SUBCRITERIA)[number]

export interface TraitSelectorCommand {
  left: string
  right: string
  selector: TraitSelector
  subcriteria?: TraitSelectorSubcriteria
}

export function parseSelectorNotation(notation: string): TraitSelectorCommand {
  const SELECTORS = TRAIT_SELECTOR.join(`|`)
  const SUBCRITERIAS = TRAIT_SELECTOR_SUBCRITERIA.join(`|`)
  const pattern = new RegExp(`^ *(.*) +(${SELECTORS})( +(${SUBCRITERIAS}))? +(.*) *$`, `i`)

  // 1. Split notation
  const [, left, rawSelector, , rawSubcriteria, right] = notation.trim().split(pattern)
  assert(!isNilOrEmpty(left) && !isNilOrEmpty(right) && !isNilOrEmpty(rawSelector), `Invalid selector notation: ${notation}`)

  // 2. Parse selector
  let selector: TraitSelector
  for (const traitSelector of TRAIT_SELECTOR) if (traitSelector.toLowerCase() === rawSelector.trim().toLowerCase()) selector = traitSelector
  assert(TRAIT_SELECTOR.includes(selector!), `Invalid selector: ${rawSelector}`)

  // 3. Parse subcriteria
  let subcriteria: TraitSelectorSubcriteria | undefined
  if (!isNilOrEmpty(rawSubcriteria?.trim())) {
    for (const traitSubcriteria of TRAIT_SELECTOR_SUBCRITERIA) if (traitSubcriteria.toLowerCase() === rawSubcriteria.trim().toLowerCase()) subcriteria = traitSubcriteria
    assert(TRAIT_SELECTOR_SUBCRITERIA.includes(subcriteria!), `Invalid subcriteria: ${rawSubcriteria}`)
  }

  const command: TraitSelectorCommand = {
    left,
    right,
    selector: selector!,
  }

  if (subcriteria) command.subcriteria = subcriteria

  return command
}
