import assert from "assert"

import { ElementPattern, ElementPatternTypes } from "./element"
import { LogicalPattern, LogicalPatternTypes } from "./logical"
import { SetPattern, SetPatternTypes } from "./set"

export * as Base from "./base"
export * as Logical from "./logical"
export * as Element from "./element"
export * as Set from "./set"

export const PatternTypes = [...LogicalPatternTypes, ...ElementPatternTypes, ...SetPatternTypes]
export type PatternType = (typeof PatternTypes)[number]

export type Pattern = LogicalPattern | ElementPattern | SetPattern
