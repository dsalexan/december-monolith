import assert from "assert"

import { IUnit } from "@december/utils/unit"

import type Token from "../../token"
import type { Attributes } from "../../token/attributes"
import { TrueMatchResult } from "./match"

export interface EvaluatorOptions {
  match?: TrueMatchResult
}

export type EvaluateFunction = (token: Token, options: EvaluatorOptions) => Partial<Attributes>

export const LexemeEvaluateFunction: EvaluateFunction = (token, options) => ({ value: token.lexeme })

export const UnitEvaluateFunction: EvaluateFunction = (token, options) => {
  assert(options.match, `No match found for token "${token.lexeme}"`)

  const unit: IUnit = options.match.data

  assert(unit && !!unit.getName && !!unit.getSymbol, `No unit found for token "${token.lexeme}"`)

  return { value: unit }
}
