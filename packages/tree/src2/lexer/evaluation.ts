import type Token from "../token"
import type { Attributes } from "../token/attributes"

export interface EvaluatorOptions {}

export type EvaluateFunction = (token: Token, options: EvaluatorOptions) => Partial<Attributes>
