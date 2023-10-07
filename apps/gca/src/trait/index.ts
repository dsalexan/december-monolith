/* eslint-disable no-debugger */
import { VariableType } from "./../../../../packages/utils/src/typing/types"
import { isNilOrEmpty, typing } from "@december/utils"
import { TraitParser } from "./parser"

import churchill from "../logger"
import TraitTag from "./tag"
import { cloneDeep, get, isNil, isNumber, isSymbol, last, max, range, set, uniq } from "lodash"
import { NullableLogBuilder } from "@december/churchill"
import chalk from "chalk"
import { SuperchargedTraitData, TRAIT_SCHEMAS, TraitDefinition } from "./sections"
import { TraitSection } from "./sections/types"
import { hasOnlybornAnd, isOnlybornAnd } from "./parser/node/utils"
import { SYNTAX_COMPONENTS } from "./parser/syntax"
import { TAGS, TagName } from "./tag/tag"
import { ISSUE_PRIORITY, TraitIssueManager, createTraitIssue, maxIssuesPriority } from "./issues"
import LogBuilder from "@december/churchill/src/builder"
import { LAZY_VALUE, UNPARSED_VALUE } from "./tag/value"
import { guessType } from "@december/utils/src/typing"

export const logger = churchill.child({ name: `trait` })

export const TRAIT_PILELINES = [`parse`, `compile`, `mount`, `validate`] as const
export type TraitPipeline = (typeof TRAIT_PILELINES)[number]

// determines that a specific value for a trait was not defined (although it is different than undefined, which can exist)
export const UNDEFINED_VALUE = Symbol.for(`UNDEFINED_VALUE`)

type TraitDataTransformation = { type: `set` | `array_to_object`; tag: TagName; path: (string | number)[]; value: unknown }

export default class Trait<TDefinition extends TraitDefinition = TraitDefinition> {
  _id: string // na pratica é a linha do trait dentro do arquivo .fst, what i call "GCA ID"
  _row: {
    fst: number
    fstndx: number
  }

  _raw: string
  _parser!: TraitParser

  _tags: Partial<Record<TagName, TraitTag>> = {}
  _data!: TDefinition[`Data`]
  _mounts: { tag: Partial<Record<TagName, (string | number)[][]>>; path: Record<string, TagName[]> } = { tag: {}, path: {} } // index relating a tag to the final path of mounting
  _transformations: TraitDataTransformation[] = []

  section!: TraitSection
  book?: string
  parent?: Trait

  constructor(raw: string, id: string | number, row: { fst: number; fstndx: number }, parent?: Trait, book?: string) {
    this._raw = raw
    this._id = id.toString()
    this._row = row

    this.parent = parent
    this.book = book
  }

  data(): TDefinition[`Data`] {
    const data = this._data

    return data

    // const dataWithoutLazyValues = this.dataWithoutLazyValues()

    // const hasNameext = (dataWithoutLazyValues.nameext as any) !== UNDEFINED_VALUE && dataWithoutLazyValues.nameext !== `` && !isNil(dataWithoutLazyValues.nameext)

    // // fill some default getters
    // return {
    //   ...data, //
    //   fullname: !hasNameext ? data.name : `${data.name} (${data.nameext})`,
    // }
  }

  parse(issues: TraitIssueManager, log?: NullableLogBuilder) {
    this._run(`parse`, issues, log)
  }

  compile(issues: TraitIssueManager, log?: NullableLogBuilder) {
    this._run(`compile`, issues, log)
  }

  mount(issues: TraitIssueManager, log?: NullableLogBuilder) {
    this._run(`mount`, issues, log)
  }

  validate(issues: TraitIssueManager, log?: NullableLogBuilder) {
    this._run(`validate`, issues, log)
  }

  _run(pipeline: TraitPipeline, issues: TraitIssueManager, log?: NullableLogBuilder) {
    if (log) log.add(pipeline).verbose().tab()

    if (pipeline === `parse`) this._parse(issues, log)
    else if (pipeline === `compile`) this._compile(issues, log)
    else if (pipeline === `mount`) this._mount(issues, log)
    else if (pipeline === `validate`) this._validate(issues, log)
    else {
      // ERROR: Unimplemented pipeline
      debugger
    }
    if (log) this._logPipeline(issues, `parse`, log).tab(-1)
  }

  _parse(issues: TraitIssueManager, log?: NullableLogBuilder) {
    let raw = this._raw

    const startsWithComma = raw.startsWith(`,`)
    if (!startsWithComma) raw = `,${raw}`

    raw = `⟨${raw.trim()}⟩` // we pretend there is an parenthesis enclosure around this, as seen when instantiating root node

    if (log)
      log
        .add(chalk.italic(`(${raw.length})`))
        .add(chalk.grey(raw))
        .verbose()

    try {
      this._parser = new TraitParser(raw)
      this._parser.parse(log)
    } catch (ex) {
      debugger
    }
  }

  _compile(issues: TraitIssueManager, log?: NullableLogBuilder) {
    const root = this._parser.root

    // ERROR: Root must be imaginary
    if (root.syntax.name !== `imaginary`) debugger

    // ERROR: There must be offspring
    if (root.children.length === 0) debugger

    // if (log)
    //   root.children[0].printer.print({
    //     log,
    //     levels: [2],
    //     calculateLevels: [2],
    //     sections: [`text`, `nodes`],
    //     lineSizeWithoutLevenPadding: 210,
    //     onlyRelevantSource: true,
    //     boldString: true,
    //     colorInnerOnlyEnclosure: true,
    //     useParentColor: true,
    //     dimNodes: true,
    //   })

    if (log) log.tab()

    // ERROR: First level child must be onlyborn AND comma
    const isOnlyborn = root.children.length === 1
    const isComma = root.children[0]?.syntax?.name === `comma`
    if (!isOnlyborn || !isComma) debugger

    const separator = root.children[0]
    const lists = separator.children

    const tags = {} as Record<TagName, TraitTag>
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i]

      if (list.syntax.name === `nil` || isOnlybornAnd(list.children, [`nil`])) {
        if (i === 0) continue

        // if it has onlyborn and nil, just not the first on line, something is wrong
        debugger
      }

      const tagName = list.children[0].substring.trim()
      if (log) log.add(chalk.italic.grey(i)).add(tagName).verbose()

      const tag = new TraitTag(this, list)
      const localIssues = tag.parse()

      issues.add(`compile`, ...localIssues)
      if (maxIssuesPriority(localIssues) >= 2) {
        debugger
      }

      if (log)
        log
          .add(
            chalk.gray.italic(
              `  ${
                tag.values === UNPARSED_VALUE ? `UNPARSED` : tag.values.map(value => (isSymbol(value) ? value.toString().replace(`Symbol(`, ``).replace(`_VALUE)`, ``) : `PARSED`))
              } (${localIssues.length} issues)`,
            ),
          )
          .verbose({ duration: true })

      tags[tag.name] = tag
    }

    if (log) log.tab(-1)

    this._tags = tags
  }

  modes() {
    const tag = this._tags[`mode` as TagName]
    if (!tag) return 0

    const nodes = tag.valueNode.children

    if (isOnlybornAnd(nodes, [`pipe`])) {
      // modes do have pipes

      return nodes[0].middles.length + 1
    }

    // how do deal with multiple children here? {if (nodes.length > 1)}
    //    in this cases would be something like mode(ModeName (Something in parenthesis))

    // modes do not have pipes
    return 1
  }

  _mount(issues: TraitIssueManager, log?: NullableLogBuilder) {
    /**
     * there are 2 types of data
     *    root - transfered directly to data
     *    mode - transfered to one of the N modes (N based on the qtd of pipes in mode tag)
     *           those N modes are then transfered to data.modes
     */

    // split in root and modes
    type Targets = `root` | `mode`

    const M = this.modes()
    const hasModes = M > 0
    const byTarget = {
      root: [],
      mode: [],
    } as Record<Targets, TraitTag[]>

    for (const tag of Object.values(this._tags)) {
      // dont bother mounting unparsed tags
      if (!tag.isValueParsed) continue

      const definition = TAGS[tag.name]
      if (!definition) debugger

      if (definition.mode && hasModes) {
        byTarget.mode.push(tag)
      } else {
        byTarget.root.push(tag)
      }
    }

    // transfer values based on targets
    const transformations = [] as TraitDataTransformation[]

    for (const target of Object.keys(byTarget) as Targets[]) {
      const tags = byTarget[target]

      for (const tag of tags) {
        if (!tag.isValueParsed) debugger

        const values = tag.values as any[]

        if (target === `root`) {
          transformations.push({ type: `set`, tag: tag.name, path: [tag.name], value: values[0] })
        } else if (target === `mode`) {
          // check for a mismtach
          const numberOfValuesIsM = values.length === M
          const onlyOneValue = values.length === 1

          const isMistached = !(numberOfValuesIsM || onlyOneValue)

          if (isMistached) {
            issues.add(
              `mount`,
              createTraitIssue(`mismatched_number_of_nodes_in_tag`, {
                trait: this,
                tag,
                node: tag.valueNode,
                //
                key: tag.name,
                expected: M,
                received: values.length,
              }),
            )
          } else {
            for (let modeIndex = 0; modeIndex < values.length; modeIndex++) {
              let value = values[modeIndex]
              let name = tag.name
              if (name === `mode`) name = `name`

              transformations.push({ type: `set`, tag: tag.name, path: [`modes`, modeIndex, name], value })
            }
          }
        } else {
          // ERROR: Unimplemented target transfer
          debugger
        }
      }
    }

    // // add modes conversion from index to object as a transformation
    // if (M > 0)
    //   transformations.push({
    //     type: `array_to_object`,
    //     tag: `mode`,
    //     path: [`modes`],
    //     value: undefined,
    //   })

    // apply transformations
    const mounts = { tag: {}, path: {} } as typeof this._mounts
    const data = {} as any

    //    order transformations by type priority
    const typePriority = [`set`, `array_to_object`] as TraitDataTransformation[`type`][]

    for (const type of typePriority) {
      const transformationsOfType = transformations.filter(t => t.type === type)

      for (const { tag, path, value } of transformationsOfType) {
        const _path = path.join(`.`)

        if (mounts.tag[tag] === undefined) mounts.tag[tag] = []
        if (mounts.path[_path] === undefined) mounts.path[_path] = []

        if (type === `set`) {
          set(data, path, value)
        } else if (type === `array_to_object`) {
          const array = get(data, path)
          const entries = [] as any[]
          for (const entry of array) {
            let key = entry.name

            // ERROR: Cannot convert a array to object if one of entries is missing the key
            if (key === undefined) debugger

            entries.push([key, entry])
          }
          const object = Object.fromEntries(entries)

          set(data, path, object)
        } else {
          // ERROR: Transformation type not implemented
          debugger
        }

        mounts.tag[tag]?.push(path)
        mounts.path[_path]?.push(tag)
      }
    }

    // save everything
    this._data = data
    this._mounts = mounts
    this._transformations = transformations
  }

  _validate(issues: TraitIssueManager, log?: NullableLogBuilder) {
    if (isNilOrEmpty(this._id)) throw new Error(`Invalid trait ID: ${this._id}`)
    if (isNil(this._row.fst)) throw new Error(`Invalid .fst row: ${this._row.fst}`)
    if (isNil(this._row.fstndx)) throw new Error(`Invalid .fstndx row: ${this._row.fstndx}`)

    // validate data against schema
    const schema = TRAIT_SCHEMAS[this.section]
    if (!schema) {
      console.error(chalk.bgRed(`${` `.repeat(50)}Schema for section "${chalk.bold(this.section)}" was not implemented${` `.repeat(50)}`))

      // ERROR: Unimplemented schema for section
      debugger
    } else {
      const data = this.data()
      const result = schema.safeParse(data)

      if (!result.success) {
        const errors = result.error.errors

        // for each zod error, parse into trait issue
        for (const error of errors) {
          const { code } = error

          const value = get(data, error.path)
          // if value was never defined (most key was not declared as a possible tag name) ignore it. there is already another error to handle this shit
          if (value === UNDEFINED_VALUE || value === UNPARSED_VALUE || value === LAZY_VALUE) continue

          if (code === `invalid_type`) {
            issues.add(
              `validate`,
              createTraitIssue(`type_differs_from_schema`, {
                trait: this,
                node: this._parser.root,
                //
                path: error.path,
                expected: error.expected,
                received: error.received,
              }),
            )
          } else if (code === `unrecognized_keys`) {
            for (const key of error.keys) {
              const path = [...error.path, key]

              const _tags = uniq(this._mounts.path[path.join(`.`)])
              const tags = _tags.map(tag => this._tags[tag])
              if (tags.length === 0) debugger // wtf
              if (tags.length > 1) debugger // ERROR: Untested

              const value = get(data, path)
              const type = guessType(value)
              if (isNilOrEmpty(type)) debugger

              issues.add(
                `validate`,
                createTraitIssue(`missing_key_in_schema`, {
                  trait: this,
                  tag: tags[0],
                  node: tags[0]!.valueNode,
                  //
                  key: path.join(`.`),
                  types: [type],
                }),
              )
            }
          } else {
            console.error(chalk.bgRed(`${` `.repeat(50)}Unimplemented schema error code "${chalk.bold(code)}"${` `.repeat(50)}`))

            // ERROR: Unimplemented schema error code
            debugger
          }
        }
      } else {
        // just go on, apparently this trait is ok
      }
    }
  }

  _logPipeline(issues: TraitIssueManager, pipeline: TraitPipeline, log: LogBuilder) {
    const gerund = {
      parse: `parsing`,
      compile: `compiling`,
      mount: `mounting`,
      validate: `validating`,
    }[pipeline]

    const numberOfErrors = issues.count(this, pipeline)
    if (numberOfErrors === 0) log.add(chalk.italic.gray(`no ${gerund} errors`)).verbose({ duration: true })
    else log.add(chalk.italic(`${chalk.bgYellow.bold(` ${numberOfErrors} `)} ${gerund} error${numberOfErrors === 1 ? `` : `s`}`)).verbose({ duration: true })

    return log
  }
}
