import path from "path"
import fs from "fs"

import chalk from "chalk"
import { zip, last, chunk, sum, isNil, isEmpty } from "lodash"

import churchill from "./logger"
import IndexedTrait, { TraitSection } from "./trait/indexed"
import IndexedCategory from "./category/indexed"

import { isNilOrEmpty, push } from "@december/utils"
import { NamedIndexMap, makeNamedIndexMap, pushToNamedIndexMap } from "./utils"

function trim(string: any) {
  return string.trim()
}

function object(value: any) {
  return { value }
}

export type ExtractedSection<TData = any> = {
  header: (string | number)[]
  data: TData[]
  span: [number, number]
  count: number
}

type ExtractionSection = `entries` | `modifiers` | `cats`

type ExtractionRecipe = {
  linesPerRecord: number
  header: ((line: string | undefined) => any)[]
  parse: (lines: string[], index: number) => IndexedTrait | IndexedCategory | string[]
}

export const logger = churchill.child({ name: `fstndx` })

const TEMPLATES = {
  entries: {
    linesPerRecord: 9,
    header: [parseInt, parseInt],
    parse: (line: string[], index: number) => IndexedTrait.General(line, index),
  },
  modifiers: {
    linesPerRecord: 5,
    header: [parseInt],
    parse: (line: string[], index: number) => IndexedTrait.Modifier(line, index),
  },
  cats: {
    linesPerRecord: 3,
    header: [parseInt, parseInt, trim, trim, parseInt],
    parse: (line: string[], index: number) => IndexedCategory.General(line, index),
  },
  // talents: {
  //   linesPerRecord: 1,
  //   header: [parseInt],
  //   parse: (line: string[], index: number) => line,
  // },
} as Record<ExtractionSection, ExtractionRecipe>

export class FastIndex {
  // file
  filename!: string
  directory!: string
  fullpath!: string
  content!: string[]

  // indexes
  traits: {
    byID: Record<string, IndexedTrait>
    byRow: Record<number, string>
    byNames: NamedIndexMap<string>
    bySection: Record<TraitSection, NamedIndexMap<string>>
  } = {} as any

  modifiers: {
    byRow: Record<number, IndexedTrait>
  } = {} as any

  constructor() {
    logger.verbose(`Instantiating Fast Index object`)
  }

  extract(filename: string, directory = `.`) {
    const directory_ = directory.endsWith(`/`) ? directory.slice(0, -1) : directory

    // opening file
    this.filename = filename
    this.directory = directory_
    this.fullpath = path.resolve(`${directory_}/${filename}`)

    logger.builder().tab().add(`Open fast index from "${this.fullpath}"`).debug()

    const fst = fs.readFileSync(this.fullpath, `utf-8`)
    this.content = fst.split(/\r?\n/g)

    logger
      .builder()
      .tab()
      .add(`Found ${chalk.bold(this.content.length)} lines`)
      .verbose({ duration: true })

    // compile line by line
    const sections = {} as Record<ExtractionSection, ExtractedSection>

    let cursor = 0
    for (const [name, template] of Object.entries(TEMPLATES) as [ExtractionSection, ExtractionRecipe][]) {
      const header = zip(template.header, this.content.slice(cursor, cursor + template.header.length)).map(([parser, raw]) => parser?.(raw))
      cursor += header.length

      const numberOfRecords = last(header) as number
      const sectionLines = template.linesPerRecord * numberOfRecords

      const lastLineOfContent = cursor + sectionLines
      const sectionContent = this.content.slice(cursor, lastLineOfContent)
      const lines = chunk(sectionContent, template.linesPerRecord)

      const data = []
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index]
        const trait = template.parse(line, cursor + index * template.linesPerRecord)
        data.push(trait)
      }

      const extraction = { header, lines, data, span: [cursor, lastLineOfContent], count: numberOfRecords } as ExtractedSection

      sections[name] = extraction

      cursor += sectionLines
    }

    logger
      .builder()
      .tab()
      .add(
        `Finished extracting ${chalk.bold(sum(Object.values(sections).map(section => section.data.length)))} records (${sections.entries.data.length} entries, ${
          sections.modifiers.data.length
        } modifiers).`,
      )
      .verbose({ duration: true })

    if (cursor !== this.content.length) {
      logger
        .builder()
        .tab(2)
        .add(`Only ${chalk.bold(cursor + 1)} lines were extracted (of ${this.content.length + 1}).`)
        .warn()
    }

    return sections
  }

  index(sections: Record<ExtractionSection, ExtractedSection>) {
    const { entries, modifiers, cats } = sections

    this.traits.byID = {} as Record<string, IndexedTrait>
    this.traits.byRow = {} as Record<number, string>
    this.traits.byNames = makeNamedIndexMap<string>() // byName, byNameExt, byFullname
    this.traits.bySection = {} as Record<TraitSection, NamedIndexMap<string>>

    for (const entry of entries.data as IndexedTrait[]) {
      // ID
      if (this.traits.byID[entry._id] !== undefined) debugger
      this.traits.byID[entry._id] = entry

      // ROW
      if (this.traits.byRow[entry._row] !== undefined) debugger
      this.traits.byRow[entry._row] = entry._id

      // NAME, NAMEEXT
      pushToNamedIndexMap(this.traits.byNames, entry, entry._id)

      // SECTION
      if (this.traits.bySection[entry.section] === undefined) this.traits.bySection[entry.section] = makeNamedIndexMap<string>()
      pushToNamedIndexMap(this.traits.bySection[entry.section], entry, entry._id)
    }

    logger
      .builder()
      .tab()
      .add(`Indexing extracted ${chalk.bold(entries.data.length)} entries.`)
      .verbose({ duration: true })

    this.modifiers.byRow = {} as Record<number, IndexedTrait>

    for (const entry of modifiers.data as IndexedTrait[]) {
      // // ID
      // if (byID[entry._id] !== undefined) debugger
      // byID[entry._id] = entry

      // ROW
      if (this.modifiers.byRow[entry._row] !== undefined) debugger
      this.modifiers.byRow[entry._row] = entry

      // ERROR: Untested groupless modifier
      if (isNilOrEmpty(entry.group)) debugger
    }

    logger
      .builder()
      .tab()
      .add(`Indexing extracted ${chalk.bold(modifiers.data.length)} modifiers.`)
      .verboseWithDuration()
  }

  save(filename: string, directory = `.`) {
    const sections = Object.entries(this.traits.byRow).map(([row, id]) => {
      const trait = this.traits.byID[id]

      return `${trait._row}    ${trait.section}    ${trait.name}    ${trait.nameext}`
    })

    fs.writeFileSync(path.join(directory, filename), sections.join(`\n`))
  }
}
