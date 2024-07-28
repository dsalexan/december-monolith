import assert from "assert"
import Type from "../base"
import * as Pattern from "../../pattern"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

export const ROOT = new Type(`structural`, `root`, ``).addSyntactical(-Infinity, 1)

// WARN: Always update this list when adding a new recipe
export const STRUCTURALS = [ROOT]
export const STRUCTURALS_NAMES = [`root`] as const
export type StructuralTypeName = (typeof STRUCTURALS_NAMES)[number]

export const STRUCTURALSS_BY_NAME = STRUCTURALS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
