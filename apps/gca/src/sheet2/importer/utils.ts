import { Builder, ILogger, paint } from "@december/logger"

import { ImportWarning, WarningCluster } from "./warnings"

export interface ImportOptions<TParent> {
  logger: Builder
  parent?: TParent
}

export interface ImportResult<TData> {
  data: TData
  warnings: WarningCluster
}

export type GenericImport<TReturnType = any, TRawType = unknown, TParent = any> = (raw: TRawType, options: ImportOptions<TParent>) => ImportResult<TReturnType>

export function ListImport<TParsingFunction extends GenericImport<any, unknown, TParent>, TParent>(rawList: any[], parsingFn: TParsingFunction, options: ImportOptions<TParent>) {
  const parsedList = [] as ReturnType<TParsingFunction>[`data`][]
  const warnings = new WarningCluster()

  if (rawList && rawList.length) {
    for (const item of rawList) {
      const { data: parsedItem, warnings: itemWarnings } = parsingFn(item, options)

      parsedList.push(parsedItem)
      warnings.extract(itemWarnings)
    }
  }

  return { data: parsedList, warnings }
}
