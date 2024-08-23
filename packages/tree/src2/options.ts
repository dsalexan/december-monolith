import churchill, { Block, paint, Paint } from "./logger"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

import { MasterScope, ScopeEvaluator, ScopeManager, GenericScope } from "./node/scope"

import { BaseParserOptions } from "./phases/parser"
import { BaseSemanticOptions } from "./phases/semantic"
import { BaseSimplifyOptions } from "./phases/simplify"
import { BaseExecutorOptions } from "./phases/executor"

export interface PhaseProcessingOptions {
  parser: BaseParserOptions
  semantic: BaseSemanticOptions
  simplify: BaseSimplifyOptions
  executor: BaseExecutorOptions
}

export interface InputProcessingOptions {
  logger?: typeof _logger
  scope: {
    root: MasterScope | MasterScope[]
    evaluators?: ScopeEvaluator[]
  }
}

export interface BaseProcessingOptions {
  logger?: typeof _logger
  scope: ScopeManager
}

export type ProcessingOptions = BaseProcessingOptions & PhaseProcessingOptions

export function defaultProcessingOptions(options: InputProcessingOptions & Partial<PhaseProcessingOptions>): ProcessingOptions {
  const rootScope = Array.isArray(options.scope.root) ? options.scope.root : [options.scope.root]
  const scopeManager = new ScopeManager(...rootScope)
  scopeManager.addEvaluator(...(options.scope.evaluators ?? []))

  const base: BaseProcessingOptions = {
    logger: options.logger ?? _logger,
    scope: scopeManager,
  }

  return {
    ...base,
    //
    parser: {
      ...base,
      ...(options.parser ?? {}),
    },
    semantic: {
      ...base,
      ...(options.semantic ?? {}),
    },
    simplify: {
      ...base,
      ...(options.simplify ?? {}),
    },
    executor: {
      ...base,
      ...(options.executor ?? {}),
    },
  }
}
