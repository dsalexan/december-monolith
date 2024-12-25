import assert from "assert"
import { isNumber } from "lodash"
import { Merge } from "type-fest"

import { DEFAULT_EVALUATIONS, DefaultEvaluationsProvider } from "./evaluations"
import { DEFAULT_NODE_CONVERSORS, DefaultNodeConversionProvider } from "./conversors"
import { DEFAULT_READY_CHECKERS, DefaultReadyCheckerProvider } from "./readyCheckers"

export { DEFAULT_EVALUATIONS } from "./evaluations"
export type { DefaultEvaluationsProvider } from "./evaluations"

export { DEFAULT_NODE_CONVERSORS } from "./conversors"
export type { DefaultNodeConversionProvider } from "./conversors"

export { DEFAULT_READY_CHECKERS } from "./readyCheckers"
export type { DefaultReadyCheckerProvider } from "./readyCheckers"

export type DefaultEvaluatorProvider = Merge<Merge<DefaultEvaluationsProvider, DefaultNodeConversionProvider>, DefaultReadyCheckerProvider>
export const DEFAULT_EVALUATOR = { evaluations: DEFAULT_EVALUATIONS, conversions: DEFAULT_NODE_CONVERSORS, readyCheckers: DEFAULT_READY_CHECKERS }
