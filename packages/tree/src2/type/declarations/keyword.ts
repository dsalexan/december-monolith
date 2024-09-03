import assert from "assert"
import { isNil, last } from "lodash"
import { flow } from "fp-ts/lib/function"

import { Match, Range } from "@december/utils"
import { BasePattern } from "@december/utils/match/base"
import { EQUALS, IS_ELEMENT_OF, IsElementOfSetPattern } from "@december/utils/match/element"
import { AND, OR } from "@december/utils/match/logical"
// import { CONTAINED_IN, ContainedInSetPattern } from "@december/utils/match/set"

import Type from "../base"
import Node, { SubTree } from "../../node"
import type Token from "../../token"
import { EvaluatorOptions } from "../../phases/lexer/evaluation"
import { interleavedInOrder, wrapperInOrder } from "../../node/traversal"
import { RuleSet } from "../../nrs"

import { TYPE, NODE } from "../../match/pattern"
import { Rule, leftOperand, match, matchInChildren, nextSibling, predicate, filter, ADD_NODE_AT, firstChild, KEEP_NODE } from "../../nrs/rule"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const KEYWORD_PRIORITY = 10 ** 20
const ENCLOSURE_PRIORITY = 10 ** 1

export const KEYWORD_GROUP = new Type(`keyword`, `keyword_group`, `K`).addSyntactical(ENCLOSURE_PRIORITY + 60, Infinity) // list of "nodes" exclusevely attached to a KEYWORD, has no lexical equivalent

// WARN: Always update this list when adding a new recipe
export const KEYWORDS = [KEYWORD_GROUP]
export const KEYWORD_NAMES = [`keyword_group`] as const
export type KeywordTypeName = (typeof KEYWORD_NAMES)[number]

export const KEYWORDS_BY_NAME = KEYWORDS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
