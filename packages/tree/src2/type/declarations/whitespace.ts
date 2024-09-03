import assert from "assert"

import { REGEX } from "@december/utils/match/element"

import Type from "../base"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 *    WHITESPACE is the highest priority ever, like, inifinity
 */

export const W = new Type(`whitespace`, `whitespace`, `w`, [`operand`]).addLexical(Infinity, REGEX(/^ +$/)).deriveSyntactical(0)

// WARN: Always update this list when adding a new recipe
export const WHITESPACES = [W]
export const WHITESPACES_NAMES = [`whitespace`] as const
export type WhitespaceTypeName = (typeof WHITESPACES_NAMES)[number]

export const WHITESPACESS_BY_NAME = WHITESPACES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
