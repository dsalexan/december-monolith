import assert from "assert"
import Type from "../base"
import { Match } from "@december/utils"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const IDENTIFIER_PRIORITY = 10000000

export const IDENTIFIER = new Type(`identifier`, `identifier`, `v`).addSemantical(IDENTIFIER_PRIORITY + 10)

// WARN: Always update this list when adding a new recipe
export const IDENTIFIERS = [IDENTIFIER]
export const IDENTIFIER_NAMES = [`identifier`] as const
export type IdentifierTypeName = (typeof IDENTIFIER_NAMES)[number]

export const IDENTIFIERS_BY_NAME = IDENTIFIERS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
