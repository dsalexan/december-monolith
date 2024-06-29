/* eslint-disable no-debugger */
import path from "path"
import fs from "fs"

import chalk from "chalk"
import { zip, last, chunk, sum, isNil, isEmpty, groupBy, uniq, range } from "lodash"

import churchill from "./logger"
import IndexedTrait, { TraitSection } from "./trait/indexed"
import IndexedCategory from "./category/indexed"

import { isNilOrEmpty, push } from "@december/utils"
import { NamedIndexMap, makeNamedIndexMap, pushToNamedIndexMap } from "./utils"
import Trait from "./trait"
import TraitTag from "./trait/tag"
import { FastIndex } from "./fstndx"
import { getType, guessType } from "@december/utils/src/typing"
import { PrimitiveVariableTypes } from "@december/utils/src/typing/types"
import { TAG_NAMES, TagName } from "./trait/tag/tag"
import { TraitIssueManager } from "./trait/issues"
import { guessNodeType } from "./trait/parser/node/utils"

export const logger = churchill.child(`fst`)

export class Fast {
  fstndx: FastIndex

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

  constructor(fstndx: FastIndex) {
    this.fstndx = fstndx
    logger.verbose(`Instantiating Fast object`)
  }

  extract(filename: string, directory = `.`) {
    const directory_ = directory.endsWith(`/`) ? directory.slice(0, -1) : directory

    // opening file
    this.filename = filename
    this.directory = directory_
    this.fullpath = path.resolve(`${directory_}/${filename}`)

    const log = logger.builder()
    log.tab()

    log.add(`Open fast from "${this.fullpath}"`).debug()

    const fst = fs.readFileSync(this.fullpath, `utf-8`)
    this.content = fst.split(/\r?\n/g)

    log.add(`Found ${chalk.bold(this.content.length)} lines`).verbose({ duration: true })

    // parse raw entries into Traits
    const _placeholder = /^[-]+$/
    const traits = [] as Trait[]
    const errors = {} as any

    const traitLogger = churchill.child(`trait`, `data`).tab()

    const issues = new TraitIssueManager()

    for (let i = 0; i < this.content.length; i++) {
      const line = this.content[i]
      if (line === ``) continue

      if (i % 500 === 0 && i > 0)
        log
          .add(`  `)
          .add(chalk.grey(`[${i}]`.padEnd(this.content.length.toString().length + 2, ` `)))
          .verbose({ duration: true })

      // let GOOD_TESTING_CASES = [
      //   11893, 3375, 1588, 1493, 802, 759, 575, 563, 541, 498, 452, 308, 241, 235, 228, 205, 166, 147, 135, 122, 112, 111, 105, 102, 92, 68, 50, 36, 47, 10, 7, 2, 0,
      // ]
      // GOOD_TESTING_CASES = uniq(GOOD_TESTING_CASES.map(_index => range(-2, 2 + 1).map(mod => _index + mod)).flat())
      // if (!GOOD_TESTING_CASES.includes(i)) continue
      // if (![7, 2, 0].includes(i)) continue
      // if (![147].includes(i)) continue
      // if (![459].includes(i)) continue
      // if (![541].includes(i)) continue
      // if (![235, 241].includes(i)) continue
      // if (![10].includes(i)) continue
      // if (![1493].includes(i)) continue

      const typing = this.fstndx.traits.byID[i]

      traitLogger
        .add(chalk.grey(`${chalk.bgBlue.black(` [${chalk.bold(i)}] | ${chalk.italic(typing.section ?? `<unknown section>`)} `)} | ${chalk.italic(line.length > 100 ? line.substring(0, 97) + `...` : line)}`))
        .verbose({ duration: true })

      const trait = new Trait(line, i, { fst: i + 1, fstndx: typing._row + 1 })
      trait.section = typing.section

      // ERROR: Unimplemented for sectionless trait
      if (isNil(trait.section)) debugger

      traitLogger.tab()

      trait.parse(issues)

      trait.compile(issues)
      trait.mount(issues)

      // PRINT A LOT OF SHIT TO DEBUG
      const PRINT_A_LOT_OF_SHIT_TO_DEBUG = false && [235].includes(i)
      if (PRINT_A_LOT_OF_SHIT_TO_DEBUG) {
        const root = trait._parser.root
        root.printer.compact({ lineSizeWithoutLevenPadding: 240 })
        // root.printer.print({ sections: [`nodes`, `text`], calculateLevels: [2, 3], lineSizeWithoutLevenPadding: 200, dontRepeatDigitsInHeader: true })

        const context = `ρ3.n`
        const node = trait._parser.get(context)
        if (!node) traitLogger.add(chalk.bgRed(` Could not find node "${chalk.bold(context)}" at trait ${chalk.bold(i)} `)).error()
        else node.printer.relevant({ sections: [`context`], lineSizeWithoutLevenPadding: 240 })
      }

      // REFERENCES TO SPEED-UP ERROR RESOLUTION
      TAG_NAMES // TraitTag.TRAIT_TAG_NAMES

      /**
       * HOW TO RESOLVE ERRORS
       *
       * [Missing Tag Name]
       *  Will show all tags that are not properly registered within src/trait/tag/tag.ts > TAG_NAMES.
       *  To "register" a tag is to condense is description from GCA documentation (https://www.misersoft.com/gca/downloads/GCA%20Data%20File%20Reference%20Guide.pdf) into a TagDefinition format
       *  There is a spreadsheet for this (./apps/data/gca/tag_definitions.xlsx)
       *
       *  Resolution:
       *    - Open GCA Data File Reference Guide.pdf
       *    - Find the tag
       *    - Read its information, condense relevant shit into a TypeDefinition format
       *    - Add to TAG_NAMES in src/trait/tag/tag.ts
       *    - Now the tag name is not missing anymore. In case its type is too complex to deal atm, just set "type: unknown".
       *      - This will trigger another issue down the line, but thats ok
       *
       *
       * [Incomplete Tag Definition]
       *  When a tag definition exisits, but its information is somewhat incomplete.
       *  Currently that means its type is "unknown". So you will have to make it known.
       *
       *  Resolution:
       *    - Decide on a format for the tag. Name it something.
       *      - It is important to take in consideration all possible data formats across all traits. A suitable summary is shown in issues.
       *      - It is recommended a dedicated run with the tag name in analysis to see ALL values across all traits.
       *    - Update the name in all places (src/trait/tag/tag.ts and spreadsheet).
       *    - This will trigger the missing implementation issue down the line.
       *
       *
       * [Missing Tag Type Implementation]
       * When a definition has a type, but its implementation is missing from src/trait/tag/value.ts > _definition.
       *
       * Resolution:
       *    - Just add the implementation
       *    - Use issues summary/analysis to determine the code.
       *    - Don't forget to account for multiple nodes (if applicable)
       *
       *
       * [Tag Not Parsed]
       *  Will show, trait by trait, all the tags and its values that were not parsed.
       *  The reason why a value was not parsed can vary a lot, but will probably be informed in another issue
       *  Here we have a "summary" of all unparsed tags across all traits, so it is more usefull at the trail end of the project.
       *
       *  Resolution:
       *    - Find out why the value was not parsed (look in other issues)
       *    - Solve that issue
       *
       *
       * [Mismatched Number of Nodes in Tag]
       *  When a tag is mode enabled, but its number of pipes doest not match the number of pipes in the "mode()" tag (mode tag informs mode names)
       *  ...
       *
       *
       * [Missing Key in Schema]
       *  Will show all tags that are not tracked by the trait section's schema.
       *  Will also show a breakdown of all types of values that are present in all lines for that tag/section.
       *    This breakdown is useful to understand which tag to implement next (and how to implement it).
       *  Although this error type is only thrown at VALIDATE, it is the most important one for the big picture.
       *  It is IMPORTANT to prioritize resolution of SIMPLER tags (usually primitives), to remove clutter from the console (specially at [Unsuccessful Tag Value Parsing])
       *
       *  Resolution:
       *   - Go to src/trait/sections
       *   - Create a new .ts file for the section
       *   - Implement the necessary tags (name and type) in zod schema format
       *   - Update the general definition of trait (TraitDefinition) in src/trait/sections/index.ts
       *
       *
       * [Type Differs from Schema]
       *  When a value inside traits mounted data does not match the schema type (but is defined/parsed)
       *  ...
       */

      if (issues.getHighestPriorityByTrait(trait) >= 1) {
        debugger
      }

      trait.validate(issues)

      traits.push(trait)

      traitLogger.tab(-1)
    }

    log
      .add(`  `)
      .add(`Extracted ${chalk.bold(traits.length)} traits`)
      .verbose({ duration: true })

    if (issues.getHighestPriority() >= 0) {
      log.add(` `).warn()
      log.add(chalk.white.bold(`Low Priority Issues`)).warn()
      issues.print(issues.get(0), {
        log: log.tab(),
        //
        hide: [`tag_not_parsed`, `incomplete_tag_definition`], //, `unapproved_tag_type_values`, 'missing_key_in_schema'
        sections: [`skills`],
        tags: {
          abbreviateType: [
            `x`,
            `default`,
            `gives`,
            `damage`,
            `initmods`,
            `creates`,
            `notes`,
            `damtype`,
            `needs`,
            `adds`,
            `itemnotes`,
            `skillused`,
            `uses_settings`,
            `uses`,
            `usernotes`,
            `units`,
            `taboo`,
            `subsfor`,
            `shots`,
            `shortcat`,
            `selectX`,
            `replacetags`,
            `rof`,
            `reach`,
            `rcl`,
            `rangemax`,
            `rangehalfdam`,
            `parry`,
            `mods`,
            `mode`,
            `minst`,
            `levelnames`,
            `lc`,
            `conditional`,
            `acc`,
            `description`,
            `basevalue`,
            `parentof`,
          ],
          highlight: [
            //
            // `parentof`,
            // `basecost`,
            // `techlvl`,
            // `mods`,
            // `isparent`,
            // `displaycost`,
            // `page`,
            // `noresync`,
          ],
        },
      })
    }

    return traits
  }

  analysis(traits: Trait[], tags: string[]) {
    const log = logger.builder()
    log.tab()

    log.add(` `).warn()
    log.add(chalk.bgWhite.bold(`.fst Analysis`)).info().tab()

    const bySections = {} as Record<TraitSection, Record<string, Trait[]>>
    for (const trait of traits) {
      if (bySections[trait.section] === undefined) bySections[trait.section] = {}

      const tags = Object.values(trait._tags) as TraitTag[]
      for (const tag of tags) {
        if (bySections[trait.section][tag.name] === undefined) bySections[trait.section][tag.name] = []
        bySections[trait.section][tag.name].push(trait)
      }
    }

    for (const tagName of tags as TagName[]) {
      const tagSections = Object.keys(bySections) as TraitSection[]
      if (tagSections.length === 0 || sum(tagSections.map(section => bySections[section][tagName]?.length ?? 0)) === 0) continue

      const prefix = `${tagName}`
      log.add(chalk.bold(prefix)).info().tab()

      const sections = tagSections as TraitSection[]
      for (const section of sections) {
        const tagTraits = bySections[section][tagName] ?? []
        if (tagTraits.length === 0) continue

        log
          .add(`${chalk.italic.gray(section)}`)
          .info()
          .tab()

        // eslint-disable-next-line no-control-regex
        const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g

        const uniqTypes = [] as any
        const uniqTypesClean = [] as any

        for (const trait of traits) {
          const tag = trait._tags[tagName]!
          if (tag === undefined) continue // trait doesnt have this tag

          const valueNodeChildren = tag.valueNode.children

          const type = valueNodeChildren[0] === undefined ? chalk.gray.italic.bgBlack(`nil`) : guessNodeType(valueNodeChildren[0])
          const cleanType = type?.replace(ANSI, ``)
          if (uniqTypesClean.includes(cleanType!)) continue
          if (isNilOrEmpty(cleanType)) continue

          uniqTypesClean.push(cleanType)
          uniqTypes.push(type)
        }

        log.add(`${uniqTypes.join(`, `)}`).info()
        // .add(` `.repeat(prefix.length))

        const repeatingFlags = [] as string[]

        for (const trait of tagTraits) {
          const tag = trait._tags[tagName]

          const value = tag?._value.string
          const type = guessType(value)
          const isPrimitiveNonString = PrimitiveVariableTypes.includes(type!) && type !== `string`
          const uniqFlag = isPrimitiveNonString ? type : value

          const doIgnore = uniqFlag !== undefined && repeatingFlags.includes(uniqFlag)
          if (doIgnore) continue

          log
            // .add(` `.repeat(prefix.length + 1 + section.length))
            .add(chalk.gray(`[${chalk.bold(trait._id)}]${` `.repeat(Math.max(1, traits.length.toString().length - trait._id.toString().length))}`))
            .add(tag ? chalk.bgBlack(tag._value.string) : `<unknown tag>`)

          if (isPrimitiveNonString) log.add(chalk.gray.italic(` (${type}) `))

          log.info()

          if (uniqFlag !== undefined) repeatingFlags.push(uniqFlag)
        }

        log.tab(-1)
      }

      log.tab(-1)
    }

    log.tab(-1)
  }
}
