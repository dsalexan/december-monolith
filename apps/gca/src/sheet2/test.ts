import path from "path"
import { cloneDeep, get, isNil, isString, max, range } from "lodash"

import churchill, { paint, Block } from "../logger"

import CharacterSheet from "."
import GCACharacterImporterStrategy from "./importer/gca"
import { arrayJoin } from "@december/utils"
import { Computed } from "@december/compile"

export const logger = churchill.child(`sheet2`, undefined, { separator: `` })

const sheet = new CharacterSheet(logger)

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)
sheet.import(pathfile, GCACharacterImporterStrategy).then(_sheet => {
  // start to work on all attacks, i guess

  const traits = [...sheet.traits, ...sheet.stats]
  const _traits = traits.map(trait => trait.data)
  const traitsWithModes = _traits.filter(trait => !!trait?.modes?.length)

  for (const trait of traitsWithModes) {
    logger.add(paint.bold(trait.name))
    logger.add(`  `, paint.grey(trait.id))
    logger.add(`  `, paint.grey(trait._.aliases?.join(`, `) || ``))
    logger.debug()

    logger.tab()
    for (let i = 0; i < trait.modes!.length; i++) {
      const mode = trait.modes![i]
      const _mode = trait._.raw!.modes![i]

      const _prefix = `[${i}] `

      const lines: Block[][] = []

      // HEADER
      const paths = [
        //
        `name`,
        [`damagebasedon`, `damage.basedOn`],
        [`damage`, `damage.value`],
        [`dmg`, `damage.form`],
        [`damtype`, `damage.type`],
      ]
      const header: Block[] = [paint.grey.italic(_prefix), ...paths.map(path => paint.grey(isString(path) ? path : path[1]))]
      lines.push(arrayJoin(header, paint.grey(`  `)))

      // RAW
      const raw: Block[] = [paint.identity(` `.repeat(_prefix.length))]
      for (const path of paths) {
        const [rawPath, compiledPath] = isString(path) ? [path, path] : path

        const rawValue = get(_mode, rawPath)
        const compiledValue = Computed.Value.ComputedValue.get(get(mode, compiledPath))

        let _value = String(rawValue)
        let color = paint.white

        if (isNil(rawValue)) {
          color = paint.grey.italic
          _value = `—`
        }

        if (rawValue !== compiledValue) color = paint.red

        raw.push(color(_value))
      }

      lines.push(arrayJoin(raw, paint.grey(`  `)))

      // COMPILED
      const compiled: Block[] = []

      let somethingWasDifferent = false
      for (const path of paths) {
        const [rawPath, compiledPath] = isString(path) ? [path, path] : path

        const rawValue = get(_mode, rawPath)
        const compiledValue = Computed.Value.ComputedValue.get(get(mode, compiledPath))

        let _value = String(compiledValue)
        somethingWasDifferent = somethingWasDifferent || rawValue !== compiledValue
        if (rawValue === compiledValue) _value = ` `.repeat(_value.length)

        compiled.push(paint.green(_value))
      }
      if (!somethingWasDifferent) compiled.unshift(paint.red(` `.repeat(_prefix.length)))
      else compiled.unshift(paint.red(`[!]${` `.repeat(_prefix.length - 3)}`))

      lines.push(arrayJoin(compiled, paint.grey(`  `)))

      // COMPUTE COLUMN SIZES
      const columns = range(0, max(lines.map(line => line.length))).map(() => 0)
      for (const line of lines) {
        for (let column = 0; column < line.length; column++) {
          const cell = line[column]

          const columnSize = columns[column]
          const size = String(cell._data).length

          columns[column] = max([columnSize, size])!
        }
      }

      // PRINT PADDED
      for (const line of lines) {
        for (let column = 0; column < line.length; column++) {
          const cell = line[column]

          const columnSize = columns[column]
          const size = String(cell._data).length

          const paddingSize = columnSize - size

          logger.add(cell)
          if (paddingSize > 0) logger.add(` `.repeat(paddingSize))
        }

        logger.debug()
      }
    }
    logger.tab(-1)
  }

  debugger
})
