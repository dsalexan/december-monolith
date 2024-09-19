import churchill, { Block, paint, Paint } from "./logger"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

import { MasterScope, ScopeEvaluator, ScopeManager, GenericScope } from "./node/scope"

import { BaseParserOptions } from "./phases/parser"
import { BaseSemanticOptions } from "./phases/semantic"
import { BaseSimplifyOptions } from "./phases/simplify"
import { BaseReducerOptions } from "./phases/reducer"
import { BaseResolverOptions } from "./phases/resolver"

export interface PhaseProcessingOptions {
  parser?: BaseParserOptions
  semantic?: BaseSemanticOptions
  simplify?: BaseSimplifyOptions
  reducer?: BaseReducerOptions
  resolver: BaseResolverOptions
}

export interface InputProcessingOptions {
  logger?: typeof _logger
  debug?: boolean
  scope: {
    root: MasterScope | MasterScope[]
    evaluators?: ScopeEvaluator[]
  }
}

export interface BaseProcessingOptions {
  logger?: typeof _logger
  debug: boolean
  scope: ScopeManager
}

export type ProcessingOptions = BaseProcessingOptions & PhaseProcessingOptions

export function defaultProcessingOptions(options: InputProcessingOptions & PhaseProcessingOptions): ProcessingOptions {
  const rootScope = Array.isArray(options.scope.root) ? options.scope.root : [options.scope.root]
  const scopeManager = new ScopeManager(...rootScope)
  scopeManager.addEvaluator(...(options.scope.evaluators ?? []))

  const base: BaseProcessingOptions = {
    logger: options.logger ?? _logger,
    debug: options.debug ?? false,
    scope: scopeManager,
  }

  const parser = {
    ...base,
    ...(options.parser ?? {}),
  }
  const semantic = {
    ...base,
    ...(options.semantic ?? {}),
  }
  const simplify = {
    ...base,
    ...(options.simplify ?? {}),
  }
  const reducer = {
    ...base,
    ...(options.reducer ?? {}),
  }

  const resolver = {
    ...base,
    simplify,
    reducer,
    ...(options.resolver ?? {}),
  }

  return {
    ...base,
    //
    parser,
    semantic,
    simplify,
    reducer,
    resolver,
  }
}
