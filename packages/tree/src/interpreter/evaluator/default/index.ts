import assert from "assert"
import { isNumber } from "lodash"
import { Merge } from "type-fest"

import { DEFAULT_EVALUATIONS, DefaultEvaluationsProvider } from "./evaluations"
import { DEFAULT_NODE_CONVERSORS, DefaultNodeConversionProvider } from "./conversors"
import { DEFAULT_POST_PROCESS, DefaultPostProcessProvider } from "./postProcess"

export { DEFAULT_EVALUATIONS } from "./evaluations"
export type { DefaultEvaluationsProvider } from "./evaluations"

export { DEFAULT_NODE_CONVERSORS } from "./conversors"
export type { DefaultNodeConversionProvider } from "./conversors"

export { DEFAULT_POST_PROCESS } from "./postProcess"
export type { DefaultPostProcessProvider } from "./postProcess"

export type DefaultEvaluatorProvider = Merge<Merge<DefaultEvaluationsProvider, DefaultNodeConversionProvider>, DefaultPostProcessProvider>
export const DEFAULT_EVALUATOR = { evaluations: DEFAULT_EVALUATIONS, conversions: DEFAULT_NODE_CONVERSORS, postProcess: DEFAULT_POST_PROCESS }
