import { Block, Builder, paint } from "@december/logger"
import { arrayJoin, isNilOrEmpty } from "@december/utils"
import { groupBy } from "lodash"

export type WarningType = `NonParsedKeys`

export type ImportWarning = {
  type: WarningType
  source: string
  data: any
}

function typeLabel(type: WarningType) {
  if (type === `NonParsedKeys`) return `non-parsed keys`

  debugger

  return type
}

export class WarningCluster {
  list: ImportWarning[] = []

  get length() {
    return this.list.length
  }

  static from(...warnings: ImportWarning[]) {
    const cluster = new WarningCluster()

    cluster.add(...warnings)

    return cluster
  }

  _add(warning: ImportWarning | null) {
    if (warning === null) return
    this.list.push(warning)
  }

  add(...warnings: (ImportWarning | null)[]) {
    for (const warning of warnings) this._add(warning)

    return this
  }

  extract(cluster: WarningCluster) {
    this.add(...cluster.list)

    return this
  }

  print(logger: Builder) {
    if (this.list.length === 0) return

    const byType = groupBy(this.list, `type`)
    const types = Object.keys(byType) as WarningType[]

    logger.add(paint.bold(`---`)).debug()
    logger.add(paint.white.bold(`WARNINGS`), paint.grey(` (`))

    // HEADER
    for (let i = 0; i < types.length; i++) {
      const type = types[i]
      const warnings = byType[type]

      const bySource = groupBy(warnings, `source`)
      const byKey = groupBy(warnings, `data`)

      logger.add(paint.yellow.bold(Object.keys(byKey).length))
      logger.add(paint.grey(` ${typeLabel(type)}`))

      if (i < types.length - 1) logger.add(paint.grey(`; `))
    }

    logger.add(paint.grey(`)`)).debug()

    // BODY
    logger.tab() // COMMENT
    for (let i = 0; i < types.length; i++) {
      const type = types[i]
      const typeWarnings = byType[type]

      const bySource = groupBy(typeWarnings, `source`)
      const byData = groupBy(typeWarnings, `data`)

      logger.add(paint.bold(type)).debug()

      logger.tab() // COMMENT
      const keys = Object.keys(byData) as string[]
      const orderedKeys = keys.sort((a, b) => byData[b].length - byData[a].length)
      for (const key of orderedKeys) {
        const warnings = byData[key]

        logger.add(key)
        logger.add(...paint.grey(` (at `, paint.bold(warnings.length), ` entries)`))
        logger.debug()
      }
      logger.tab(-1) // COMMENT
    }
    logger.tab(-1) // COMMENT
  }

  _inline() {
    if (this.length === 0) return ``

    let log = [] as (Block | string)[][]
    const byType = groupBy(this.list, `type`)

    for (const type of Object.keys(byType) as WarningType[]) {
      const warnings = byType[type]

      const bySource = groupBy(warnings, `source`)
      const byKey = groupBy(warnings, `data`)

      log.push([paint.bold(warnings.length), ` ${typeLabel(type)}`])
    }

    return [` `, ...arrayJoin(log, `, `).flat()]
  }
}

export function nonParsedKeys(rawObject: any, parsedObject: any, source: string): ImportWarning[] {
  const ignoreKeys = [`$`]

  const rawKeys = Object.keys(rawObject)
  const parsedKeys = Object.keys(parsedObject)

  const nonParsedKeys = rawKeys.filter(key => !parsedKeys.includes(key) && !ignoreKeys.includes(key))

  return nonParsedKeys.map(key => ({
    type: `NonParsedKeys`,
    source,
    data: key,
  }))
}
