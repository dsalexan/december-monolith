import assert from "assert"

import { ValuePattern, ValuePatternTypes } from "./value"
import { LogicalPattern, LogicalPatternTypes } from "./logical"
import { SetPattern, SetPatternTypes } from "./set"

export * as Base from "./base"
export * as Value from "./value"
export * as Logical from "./logical"
export * as Set from "./set"

export type Pattern = ValuePattern | LogicalPattern<any> | SetPattern<any>

export const PatternTypes = [...ValuePatternTypes, ...LogicalPatternTypes, ...SetPatternTypes]
