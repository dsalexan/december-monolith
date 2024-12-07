import churchill, { Block, paint, Paint } from "./logger"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

import { MasterScope } from "./node/scope"

import { BaseParserOptions } from "./phases/parser"
import { BaseSemanticOptions } from "./phases/semantic"
import { BaseSimplifyOptions } from "./phases/simplify"
import { BaseReducerOptions } from "./phases/reducer"
import { BaseResolverOptions } from "./phases/resolver"

import { SubTree } from "./node"
import { SymbolFromNodeOptions } from "./environment/symbolTable"

export interface PhaseProcessingOptions {
  parser?: BaseParserOptions
  semantic?: BaseSemanticOptions
  simplify?: BaseSimplifyOptions
  reducer?: BaseReducerOptions
  resolver?: BaseResolverOptions
}

export interface InputProcessingOptions {
  logger?: typeof _logger
  debug?: boolean
  AST?: SubTree
  //
  scope: MasterScope
}

export interface BaseProcessingOptions extends SymbolFromNodeOptions {
  logger?: typeof _logger
  debug: boolean
}

export type ProcessingOptions = BaseProcessingOptions & PhaseProcessingOptions

export function defaultProcessingOptions(options: InputProcessingOptions & PhaseProcessingOptions): ProcessingOptions {
  const base: BaseProcessingOptions = {
    logger: options.logger ?? _logger,
    debug: options.debug ?? false,
    scope: options.scope,
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

  const _resolver = options.resolver ?? {}
  const resolver = {
    ...base,
    ..._resolver,
    simplify: { ...simplify, ...(_resolver.simplify ?? {}) },
    reducer: { ...reducer, ...(_resolver.reducer ?? {}) },
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
