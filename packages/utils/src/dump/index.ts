import assert from "assert"
import { isArray, isEmpty, isObject, isObjectLike, isString, sum } from "lodash"

import { Block, paint, Builder } from "@december/logger"

import { typing } from ".."
import { isPrimitive } from "../typing"
import { Nullable } from "tsdef"

const TAB = 2

export function d1ump(logger: Builder, value: unknown, tab: number = 0, eof?: Block[]) {
  if (tab > 0) logger.tab(TAB)

  if (value === undefined) logger.add(paint.grey.italic(`undefined`))
  else if (value === null) logger.add(paint.grey.italic.bold(`null`))

  let doInline = false

  const type = typing.guessType(value)
  assert(type, `Type is not defined`)
  if ([`string`, `number`, `boolean`].includes(type)) logger.add(...[])
  else if (isArray(value)) {
    doInline = primitiveDeepCount(value) < 50

    logger.add(paint.grey(`[`))
    if (doInline) logger.add(` `)
    else logger.debug()

    for (const item of value) d1ump(logger, item, tab + TAB, [paint.dim.grey(`, `)])

    if (doInline) logger.add(` `)
    logger.add(paint.grey(`]`))
  } else if (isObject(value)) {
    if (isEmpty(value)) logger.add(paint.grey.dim(`{ ⌀ }`))
    else {
      doInline = primitiveDeepCount(value) < 50

      logger.add(paint.grey(`{`))
      if (doInline) logger.add(` `)
      else logger.debug()

      const keys = Object.keys(value)
      for (const key of keys) {
        logger.add(paint.grey(key)).add(paint.grey.dim(`: `))
        d1ump(logger, value[key], tab + TAB, [paint.dim.grey(`, `)])
      }

      if (doInline) logger.add(` `)
      logger.add(paint.grey(`}`))
    }
  }

  //
  if (eof && eof.length > 0) logger.add(...eof)
  if (!doInline) logger.debug()
  if (tab > 0) logger.untab(TAB)
}

export class RowsWrapper {
  public padding: number = 0
  public rows: Block[][] = []

  constructor(padding: number = 0) {
    this.padding = padding
    this.eol()
  }

  public setPadding(padding: number): this {
    this.padding = padding
    return this
  }

  public add(otherRows: Block[][]): this {
    if (otherRows.length === 0) return this
    else if (otherRows.length === 1) return this.push(...otherRows[0])

    for (const row of otherRows) {
      this.push(...row)
      this.eol()
    }

    return this
  }

  public push(...blocks: Block[]): this {
    this.rows[this.rows.length - 1].push(...blocks)
    return this
  }

  public eol(): this {
    const newRow: Block[] = []

    if (this.padding > 0) newRow.push(paint.identity(` `.repeat(this.padding)))

    this.rows.push(newRow)
    return this
  }

  public pad(addedPadding: number = 0): this {
    const padding = this.padding + addedPadding
    if (padding > 0) this.push(paint.identity(` `.repeat(padding)))

    return this
  }

  public isValid(): boolean {
    return this.rows.every(row => row.length > 0)
  }
}

export function dump(value: unknown, padding: number = 0, eol: Block[] = []): Block[][] {
  const primitive = dumpPrimitive(value)
  if (primitive) return [[...primitive, ...eol]]

  const rows = new RowsWrapper()

  if (isArray(value) || isObject(value)) {
    const isObject = !isArray(value)

    const doInline = primitiveDeepCount(value) <= 4

    rows.push(paint.grey(isObject ? `{` : `[`))

    if (doInline) rows.push(paint.identity(` `))
    else rows.eol()

    const items = isObject ? Object.keys(value as any) : value
    for (const [i, item] of items.entries()) {
      if (!doInline) rows.pad(padding + TAB)

      let localValue: any = item
      if (isObject) {
        const key = item as string

        rows.push(paint.grey(key), paint.grey.dim(`: `)) // "<key>: "
        localValue = value[key]
      }

      const lineEnd = i < items.length - 1 ? [paint.dim.grey(`, `)] : []
      rows.add(dump(localValue, doInline ? 0 : padding + TAB, lineEnd))

      if (i < items.length - 1) {
        if (!doInline) rows.eol()
      }
    }

    if (doInline) rows.push(paint.identity(` `))
    else rows.eol()

    if (!doInline && padding > 0) rows.pad(padding)
    rows.push(paint.grey(isObject ? `}` : `]`))
  }
  //
  else if (!isPrimitive(value)) throw new Error(`Value type not implemented`)

  if (eol.length > 0) rows.push(...eol)

  // assert(rows.isValid(), `Rows are not valid`)

  return rows.rows.filter(row => row.length > 0)
}

export function dumpPrimitive(value: unknown): Nullable<Block[]> {
  if (!typing.isPrimitive(value)) return null

  if (value === undefined) return [paint.grey.italic(`undefined`)]
  else if (value === null) return [paint.grey.italic.bold(`null`)]

  const type = typing.guessType(value)

  if (type === `string`) return [paint.dim.grey(`"`), paint.green(value), paint.dim.grey(`"`)]
  else if (type === `number`) {
    const numericValue = parseFloat(value)

    if (isNaN(numericValue)) return [paint.red.italic(`NaN`)]
    else if (numericValue === Infinity) return [paint.blue.italic(`∞`)]
    else if (numericValue === -Infinity) return [paint.blue.italic(`-∞`)]
    else return [paint.blue(value)]
  } //
  else if (type === `boolean`) return [paint.magenta(String(value).toLowerCase())]
  else if (type === `object` && !isArray(value) && isEmpty(value)) return [paint.grey.dim(`{ ⌀ }`)]
  else if (type === `object` && isString(value)) return [paint.red.bold(value)]
  //
  else throw new Error(`Type "${type}" not implemented`)

  return null
}

export function primitiveDeepCount(value: unknown): number {
  if (value === undefined) return 1
  else if (value === null) return 1

  const type = typing.guessType(value)
  assert(type, `Type is not defined`)
  if ([`string`, `number`, `boolean`].includes(type)) return 1
  //
  else if (isArray(value)) return sum(value.map(item => primitiveDeepCount(item)))
  else if (isObject(value)) return sum(Object.values(value).map(item => primitiveDeepCount(item) + 1))
  else if (type === `object` && isString(value)) return 1
  //
  else throw new Error(`Type "${type}" not implemented`)

  return 0
}
