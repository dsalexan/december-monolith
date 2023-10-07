/* eslint-disable no-debugger */
import { VariableType } from "@december/utils/src/typing/types"
import Trait, { TRAIT_PILELINES, TraitPipeline } from "."
import TraitTag from "./tag"
import { get, groupBy, identity, isNumber, isSymbol, max, sum, uniq } from "lodash"
import { NullableLogBuilder } from "@december/churchill"

import churchill from "../logger"
import chalk from "chalk"
import { TAGS, TagName } from "./tag/tag"
import { capString, typing } from "@december/utils"
import { UNPARSED_VALUE } from "./tag/value"
import { guessType } from "@december/utils/src/typing"
import INode from "./parser/node/interface"
import { TraitSection } from "./indexed"

export const TRAIT_ISSUE_NAMES = [
  // compile > tag > parseName
  `missing_tag_name`,
  // compile > tag > parseValue
  `incomplete_tag_definition`,
  `tag_could_be_lazy_enabled`,
  `missing_tag_type_implementation`,
  `unapproved_tag_type_values`, // a "Helper" issue to show ALL instances of a perceived type
  `unrecognized_function_name`,
  `tag_not_parsed`,
  `mismatched_number_of_nodes_in_tag`,
  // mount
  `missing_key_in_schema`,
  `type_differs_from_schema`,
] as const
export type TraitIssueName = (typeof TRAIT_ISSUE_NAMES)[number]

/**
 * 0 - Log after parsing everything
 * 1 - Log after parsing line
 * 2 - Log after parsing tag
 */
export const ISSUE_PRIORITY: Record<TraitIssueName, number> = {
  missing_tag_name: 0,
  incomplete_tag_definition: 0,
  tag_could_be_lazy_enabled: 0,
  missing_tag_type_implementation: 0,
  unapproved_tag_type_values: 0,
  unrecognized_function_name: 0,
  tag_not_parsed: 0,
  mismatched_number_of_nodes_in_tag: 0,
  missing_key_in_schema: 0,
  type_differs_from_schema: 0,
}

export function maxIssuesPriority(issues: (TraitIssue | TraitIssueWithoutPipeline)[]) {
  return max(issues.map(issue => ISSUE_PRIORITY[issue.name]))!
}

export const TRAIT_ISSUE_NAME_DISPLAY: Record<TraitIssueName, string> = {
  missing_tag_name: `Missing Tag Name`,
  incomplete_tag_definition: `Incomplete Tag Definition`,
  tag_could_be_lazy_enabled: `Tag Could Be Lazy Enabled`,
  missing_tag_type_implementation: `Missing Tag Type Implementation`,
  unapproved_tag_type_values: `Unapproved Tag Type Values`,
  unrecognized_function_name: `Unrecognized Function Name`,
  tag_not_parsed: `Tag Not Parsed`,
  mismatched_number_of_nodes_in_tag: `Mismatched Number of Nodes in Tag`,
  missing_key_in_schema: `Missing Key in Schema`,
  type_differs_from_schema: `Type Differs from Schema`,
}

type ExtraIssueInformation = {
  trait: Trait
  tag?: TraitTag
  node?: INode
  //
  key?: string
  types?: (string | undefined)[]
  //
  partial?: boolean
  //
  expected?: number | string
  received?: number | string
  //
  path?: (string | number)[]
}

export type TraitIssue = {
  //
  pipeline: TraitPipeline
  //
  name: TraitIssueName
} & ExtraIssueInformation

export type TraitIssueWithoutPipeline = Omit<TraitIssue, `pipeline`>

export function createTraitIssue(name: TraitIssueName, data: Partial<ExtraIssueInformation>) {
  const issue = {
    // trait,
    // tag,
    // node,
    // //
    // pipeline: pipeline,
    //
    name,
    // key: null as any,
    // type: null as any,
  } as TraitIssueWithoutPipeline

  // if (tag === undefined) delete issue[`tag`]
  // if (node === undefined) delete issue[`node`]

  for (const key of Object.keys(data)) {
    // @ts-ignore
    issue[key] = data[key]
  }

  return issue
}

export class TraitIssueManager {
  _issues: Record<TraitPipeline, Record<TraitIssueName, TraitIssue[]>> = {} as any

  constructor() {
    this.clear()
  }

  clear(pipeline?: TraitPipeline) {
    const pipelines = pipeline ? [pipeline] : TRAIT_PILELINES

    for (const pipeline of pipelines) {
      this._issues[pipeline] = {} as any
    }
  }

  count(trait: Trait, pipeline?: TraitPipeline) {
    let count = 0

    const pipelines = pipeline ? [pipeline] : TRAIT_PILELINES
    for (const pipeline of pipelines) {
      const issuesInPipeline = this._issues[pipeline]

      for (const key of TRAIT_ISSUE_NAMES) {
        const issues = issuesInPipeline[key] ?? []

        const traitIssues = issues.filter(issue => issue.trait._id === trait._id)

        count += traitIssues.length
      }
    }

    return count
  }

  get(priority: number, pipeline?: TraitPipeline) {
    const issues: TraitIssue[] = []

    const pipelines = pipeline ? [pipeline] : TRAIT_PILELINES
    for (const pipeline of pipelines) {
      const issuesInPipeline = this._issues[pipeline]

      for (const key of TRAIT_ISSUE_NAMES) {
        if ((issuesInPipeline[key]?.length ?? 0) === 0) continue

        if (ISSUE_PRIORITY[key] === priority) {
          issues.push(...issuesInPipeline[key])
        }
      }
    }

    return issues
  }

  add(pipeline: TraitPipeline, ...issues: (TraitIssueWithoutPipeline | TraitIssue)[]) {
    for (const issue of issues) this._add(pipeline, issue)
  }

  _add(pipeline: TraitPipeline, _issue: TraitIssueWithoutPipeline | TraitIssue) {
    const issue = _issue as TraitIssue
    issue.pipeline = pipeline

    const { name } = issue

    if (this._issues[pipeline] === undefined) this._issues[pipeline] = {} as any
    const issuesInPipeline = this._issues[pipeline]

    if (!issuesInPipeline[name]) issuesInPipeline[name] = []
    issuesInPipeline[name].push(issue)
  }

  print(allIssues: TraitIssue[], options: Partial<TraitIssuePrintOptions> = {}) {
    const { log, HIDE, PRINT } = getPrintOptions(options)

    const byName = groupBy(allIssues, `name`)
    for (const name of TRAIT_ISSUE_NAMES) {
      const issues = byName[name] ?? []
      if (issues.length === 0) continue

      const prefix = `[${TRAIT_ISSUE_NAME_DISPLAY[name]}] `

      if (HIDE.includes(name)) {
        log.add(chalk.bgGray.italic.dim(prefix)).add(chalk.grey.italic(`  (hidden)`)).warn()
        continue
      }

      let color = chalk.bgYellow
      if (name === `unrecognized_function_name`) color = chalk.bgRed
      log.add(color.italic.bold.dim(prefix)).warn().tab()

      if (name === `missing_tag_name`) log.add(chalk.grey.italic(`Tag definition is missing in tag.ts`))
      else if (name === `incomplete_tag_definition`) log.add(chalk.grey.italic(`Tag definition is incomplete in tag.ts`))
      else if (name === `tag_could_be_lazy_enabled`) log.add(chalk.grey.italic(`Tag could be Lazy enabled, but you need to check`))
      else if (name === `missing_tag_type_implementation`) log.add(chalk.grey.italic(`Type parsing by _definition is not implemented in value.ts`))
      else if (name === `unapproved_tag_type_values`) log.add(chalk.grey.italic(`List all tags/values for a specific definition type`))
      else if (name === `unrecognized_function_name`) log.add(chalk.grey.italic(`List all math functions not yet recongnized/implemented in a tag parsing`))
      else if (name === `tag_not_parsed`) log.add(chalk.grey.italic(`Tag was not parsed for some reason`))
      else if (name === `mismatched_number_of_nodes_in_tag`) log.add(chalk.grey.italic(`Tag has more modes than expected`))
      else if (name === `missing_key_in_schema`) log.add(chalk.grey.italic(`Key is in final mounted data BUT it is not in zod schema`))
      else if (name === `type_differs_from_schema`) log.add(chalk.grey.italic(`Value type differs from what is expected based on zod schema`))

      log.warn().add(` `).warn()

      if (name === `missing_tag_name` || name === `incomplete_tag_definition` || name === `tag_could_be_lazy_enabled`) {
        // when a tag name is found on a trait, but its definition is not found in TAG_NAMES (src/trait/tag/tag.ts)
        // OR
        // when a tag is found in TAG_NAMES, but its definition is incomplete (usually means its type is "unknown")

        // group issues by tag name
        const byTagName = groupBy(issues, `key`)
        const tagNames = Object.keys(byTagName).sort()
        const PAD_TAG_NAME = max(tagNames.map(string => string.length))!

        for (const tagName of tagNames) {
          const issues = byTagName[tagName]

          /**
           * [Missing Tag Name]
           *  <tagname> @ [traits[]]::pipeline
           */

          if (name === `missing_tag_name`) {
            // [when a tag name is found on a trait, but its definition is not found in TAG_NAMES (src/trait/tag/tag.ts)]

            // aggregate all trait ids by pipeline and append them to the line (just to know in which traits the tag was found)
            const pipelineDebug = cappedTraitDebug(issues, { groupByPipeline: true })

            // each tag name (key) should be a line
            log
              .add(chalk.white(tagName))
              .add(chalk.grey(`@ ${pipelineDebug}`))
              .warn()
          } else if (name === `incomplete_tag_definition`) {
            // when a tag is found in TAG_NAMES, but its definition is incomplete (usually means its type is "unknown")

            /**
             * [Incomplete Tag Definition]
             *  <tagname>
             *    <section> @ [traits[]]  <incomplete definition> [types[]]
             */

            // group by section (to check if different sections should have different definitions or types)
            const bySection = groupBy(issues, issue => issue.trait.section)
            const allSections = Object.keys(bySection)

            for (let i = 0; i < allSections.length; i++) {
              const section = allSections[i]
              const issues = bySection[section]

              // prefix all prints with section name
              if (i === 0) {
                let tagColor = PRINT.TAG.HIGHLIGHT.includes(tagName) ? chalk.white.bold.bgRedBright : chalk.white

                log.add(tagColor(` ` + tagName.padEnd(PAD_TAG_NAME + 1, ` `)))
              } else log.add(` `.repeat(PAD_TAG_NAME + 2))

              // each section should be ANOTHER line, describing the value types in that section
              const traitsDebug = cappedTraitDebug(issues)

              const types = PRINT.TAG.ABBREVIATE_TYPE.includes(tagName) ? [chalk.gray.italic(`too complex...`)] : uniqIssueTypes(issues)
              const color = chalk.white // PRINT.TAG.TONEDOWN.includes(tagName) ? chalk.grey.italic : chalk.white

              log.add(chalk.gray.italic(section))
              log.add(chalk.grey(`@ ${traitsDebug}`))
              log.add(chalk.white.bold(`  ${`unknown type`}`))
              log.add(chalk.gray(`  [${color(types.join(`, `))}]`))
              log.warn()
            }
          } else if (name === `tag_could_be_lazy_enabled`) {
            // when a tag value has [] or %%, but it is lazy enableness is not explicitly set

            /**
             * [Tag Could Be Lazy Enabled]
             *  <tagname> @ [traits[]]  <type>  <capped value>
             */

            // aggregate all trait ids by pipeline and append them to the line (just to know in which traits the tag was found)
            const traitDebug = cappedTraitDebug(issues)

            const definition = TAGS[issues[0].tag!.name]
            const stringValue = issues[0].tag!._value.string

            // each tag name (key) should be a line
            log
              .add(chalk.bold.white(tagName))
              .add(chalk.grey(`${traitDebug}`))
              .add(chalk.grey.italic(definition.type))
              .add(stringValue.length > 150 ? stringValue.substring(0, 150) + chalk.bgGray(`[...]`) : stringValue)
              .warn()
          } else {
            debugger
          }
        }
      } else if (name === `missing_tag_type_implementation`) {
        // when a tag has a definition, but it's type is not properly implemented in parseDefinition (TraitTag)

        /**
         * [Missing Tag Type Implementation]
         *  <type>
         *    <tagname> @ [traits[]]   <guess type>
         */

        // group issues by tag definition type
        const byType = groupBy(issues, issue => {
          if (!issue.tag) debugger
          const definition = TAGS[issue.tag!.name as TagName]
          return definition.type
        })
        const types = Object.keys(byType)
          .sort()
          .filter(type => type !== `unknown`)

        for (const type of types) {
          log.add(chalk.white.bold(type)).warn().tab()

          // now group issues by tag name
          const byTagName = groupBy(byType[type], `key`)
          const tagNames = Object.keys(byTagName).sort()
          const PAD_TAG_NAME = max(tagNames.map(string => string.length))!

          for (const tagName of tagNames) {
            const issues = byTagName[tagName]

            const definition = TAGS[tagName as TagName]
            if (!definition) debugger

            // aggregate all trait ids by pipeline and append them to the line (just to know in which traits the tag was found)
            const traitsDebug = cappedTraitDebug(issues)

            const types = PRINT.TAG.ABBREVIATE_TYPE.includes(tagName) ? [chalk.gray.italic(`too complex...`)] : uniqIssueTypes(issues)
            const color = chalk.white // PRINT.TAG.TONEDOWN.includes(tagName) ? chalk.grey.italic : chalk.white

            // each tag name (key) should be a line
            log.add(chalk.grey.bold(tagName))

            if (definition.lazy) log.add(chalk.bgGrey.bold(` LAZY `))
            if (definition.math) log.add(chalk.bgGray.bold(` MATH `))

            log
              .add(chalk.grey(`@ ${traitsDebug}`))
              .add(chalk.gray(`  [${color(types.join(`, `))}]`))
              .warn()
          }

          log.tab(-1)
        }
      } else if (name === `unapproved_tag_type_values`) {
        // list all tags and values for a specific definition type (usually its useful to list all values in a type before implementing it)

        /**
         * [Unapproved Tag Type Values]
         *  <type>
         *    <tagname> @ [traits[]]  <guess type>  <string value>
         */

        // group issues by type
        const byType = groupBy(issues, issue => issue.types![0])
        const allTypes = Object.keys(byType).sort()

        for (const type of allTypes) {
          const [prefix, ...suffixes] = type.split(`:`)
          log
            .add(chalk.grey.bold(`${chalk.white(prefix)}${suffixes.length > 0 ? `:` + suffixes.join(`:`) : ``}`))
            .warn()
            .tab()

          // group issues by tag
          const byTag = groupBy(byType[type], issue => issue.key)
          const allTags = Object.keys(byTag).sort() as TagName[]

          for (const tag of allTags) {
            // group by tag value string
            const byValue = Object.values(groupBy(byTag[tag], issue => issue.tag!._value.string))

            for (let i = 0; i < byValue.length; i++) {
              const issues = byValue[i]
              const definition = TAGS[tag]

              const stringValue = issues[0].tag!._value.string

              if (i === 0) {
                log.add(chalk.bold.grey(tag))
                if (definition.mode) log.add(chalk.bgGray.bold(` MODE `))
                if (definition.math) log.add(chalk.bgGray.bold(` MATH `))
                if (definition.lazy) log.add(chalk.bgGray.bold(` LAZY `))
              } else {
                log.add(` `.repeat(tag.length))
                if (definition.mode) log.add(` `.repeat(` MODE `.length))
                if (definition.math) log.add(` `.repeat(` MATH `.length))
                if (definition.lazy) log.add(` `.repeat(` LAZY `.length))
              }

              const traitsDebug = cappedTraitDebug(issues)

              log
                .add(chalk.grey(`${traitsDebug}`))
                .add(chalk.grey.italic(guessType(stringValue)))
                .add(chalk.bgBlack(stringValue))
                .warn()
            }
          }

          log.tab(-1)
        }
      } else if (name === `unrecognized_function_name`) {
        /**
         * [Unrecognized Function Name]
         *  <function name>
         *    [tag]
         *      section traits[]
         */

        const byFunction = groupBy(issues, issue => issue.key)
        const allFunctions = Object.keys(byFunction).sort()

        for (const functionName of allFunctions) {
          log.add(chalk.white.bold(functionName)).warn().tab()

          const byTag = groupBy(byFunction[functionName], issue => issue.tag!.name)
          const allTags = Object.keys(byTag).sort() as TagName[]

          for (const tagName of allTags) {
            log.add(chalk.grey.bold(tagName)).warn().tab()

            const bySection = groupBy(byTag[tagName], issue => issue.trait.section)
            const allSections = Object.keys(bySection).sort()

            for (let i = 0; i < allSections.length; i++) {
              const section = allSections[i]

              let prefix = i === 0 ? section : ` `.repeat(section.length)

              const traitsDebug = cappedTraitDebug(bySection[section])
              const substring = bySection[section][0].trait._tags[tagName]?._value.string

              log.add(chalk.gray.italic(prefix)).add(chalk.grey(traitsDebug)).add(chalk.grey(substring)).warn()
            }

            log.tab(-1)
          }

          log.tab(-1)
        }
      } else if (name === `tag_not_parsed`) {
        // when a tag is not parsed, for some reason

        /**
         * [Tag Not Parsed]
         *  [traits[]]   <section>
         *    [tag/node] value[...]
         */

        const byTraitAndPipeline = groupBy(issues, issue => `${issue.trait._id}::${issue.pipeline}`)

        for (const issues of Object.values(byTraitAndPipeline)) {
          const trait = issues[0].trait
          const pipeline = issues[0].pipeline
          const section = trait.section

          log
            .add(chalk.gray(`${chalk.white(trait._id)}::${pipeline}   ${chalk.bold(section)}`))
            .warn()
            .tab()

          for (const issue of issues) {
            const node = issue.tag?.valueNode?.context ?? `unknown node`
            const tag = issue.tag!
            if (!tag) debugger

            const [tagValue, ellipsis] = capString(tag._value.string, 180, `[...]`, true)

            const tagValueIssues = uniq(tag._value.issues.map(issue => issue.name).filter(name => name !== `tag_not_parsed`))

            log.add(chalk.italic.grey(`[${chalk.bold(tag.name)}/${node}]`))

            if (issue.partial) log.add(chalk.bgRed.bold(` PARTIALLY UNPARSED `))

            log
              .add(`${chalk.white(tagValue)}${chalk.gray(ellipsis ?? ``)}`)
              .add(chalk.grey.italic(`    (${tagValueIssues.join(`, `)})`))
              .warn()
          }

          log.tab(-1)
        }
      } else if (name === `mismatched_number_of_nodes_in_tag`) {
        // when a tag is mode enabled but has more/less pipes than modes() tag

        /**
         * [Mismatched Number of Nodes in Tag]
         *  [traits[]]   expecting <M> pipes
         *    [tag/node] value1
         *               value2
         *               ...
         *               value3
         */

        const byTraitAndPipeline = groupBy(issues, issue => `${issue.trait._id}::${issue.pipeline}`)

        for (const issues of Object.values(byTraitAndPipeline)) {
          const trait = issues[0].trait
          const pipeline = issues[0].pipeline

          let charactersColor = trait._raw.length > 600 ? (identity as any) : trait._raw.length > 200 ? chalk.yellow : trait._raw.length > 100 ? chalk.blue : chalk.green
          let characters = charactersColor(`${trait._raw.length}`)

          log
            .add(chalk.gray(`${chalk.white(trait._id)}::${pipeline}`))
            .add(chalk.gray(` expecting ${chalk.white.bold(trait.modes())} pipes`))
            .add(chalk.gray.italic(`  (${characters} characters in line)`))
            .warn()
            .tab()

          for (const issue of issues) {
            const node = issue.tag?.valueNode?.context ?? `unknown node`
            const tag = issue.tag!
            if (!tag) debugger

            let _prefix = `[${chalk.bold(tag.name)}][${node}]`

            const values = tag.values as any[]
            if ((values as any) === UNPARSED_VALUE) debugger // how?

            for (let i = 0; i < values.length; i++) {
              let prefix = _prefix
              if (i > 0) prefix = ` `.repeat(_prefix.replace(ANSI, ``).length)

              const value = values[i]

              log
                .add(chalk.italic.grey(prefix))
                .add(`${chalk.white(value.toString())}`)
                .warn()
            }
          }

          log.tab(-1)
        }
      } else if (name === `missing_key_in_schema`) {
        // when a key appears in final mounted data BUT it's not in the zod schema for the section

        /**
         * [Missing Key in Schema]
         *  [key]
         *    tag1  <definition type>
         *      {below for each typing for the value in the key}
         *      [traits[]] type
         */

        const filteredSectionsIssues = options.sections ? issues.filter(issue => options.sections?.includes(issue.trait.section)) : issues

        const byKey = groupBy(filteredSectionsIssues, issue => {
          const path = issue.key!.split(`.`)
          const genericPath = path.map(p => (typing.guessType(p) === `number` ? `x` : p))

          return genericPath.join(`.`)
        })
        const allKeys = Object.keys(byKey).sort()

        for (const key of allKeys) {
          log
            .add(chalk.white.bold.bgBlack(` ${key} `))
            .warn()
            .tab()

          const byTag = groupBy(byKey[key], issue => issue.tag?.name)
          const allTags = Object.keys(byTag).sort() as TagName[]
          for (const tag of allTags) {
            const definition = TAGS[tag]
            if (!definition) debugger /// wtf

            log
              .add(`${chalk.italic.grey(`(tag) `)}${chalk.white(tag)}`)
              .add(`${chalk.italic.grey(`(def) `)}${chalk.grey(`${definition.type}`)}`)
              .add(` `)

            if (definition.mode) log.add(`${chalk.bgGray.bold(` MODE `)}`)
            if (definition.math) log.add(`${chalk.bgGrey.bold(` MATH `)}`)
            if (definition.flag) log.add(`${chalk.bgGray.bold(` FLAG `)}`)
            if (definition.lazy) log.add(`${chalk.bgRed.bold(` LAZY `)}`)

            log.warn().tab().tab()

            const bySection = groupBy(byTag[tag], issue => issue.trait.section)
            const allSections = options.sections ?? Object.keys(bySection).sort()

            for (const section of allSections) {
              const sectionIssues = bySection[section] ?? []
              if (sectionIssues.length === 0) continue

              log.space(1).add(chalk.grey.italic(section)).warn()
              log.tab()

              const byValueType = groupBy(sectionIssues, issue => issue.types![0])
              for (const issues of Object.values(byValueType)) {
                const traitsDebug = cappedTraitDebug(issues, { capSize: 25 })

                const issue = issues[0]!

                const type = issue.types![0]
                if (!type) debugger // wtf

                const value = get(issue.trait.data(), issue.key!)
                const stringified = isSymbol(value) ? value.toString() : JSON.stringify(value) ?? String(value)

                if (stringified === undefined) debugger

                log
                  .space(1)
                  .add(chalk.grey(` ${traitsDebug}`))
                  .add(` ${type}`)
                  .add(` ${chalk.grey.italic(stringified.length > 150 ? stringified.substring(0, 150) + `[...]` : stringified)}`)
                  .warn()
              }

              log.tab(-1)
            }

            log.tab(-2)
          }

          log.tab(-1)
        }
      } else if (name === `type_differs_from_schema`) {
        // when a key's value differs from what the schema was expecting

        /**
         * [Type Differs from Schema]
         *  [key]  trait1::section  type  cappedValue
         *         trait2::section  type  cappedValue
         */

        const byKey = groupBy(issues, issue => issue.path?.join(`.`))
        const allKeys = Object.keys(byKey).sort()

        for (const key of allKeys) {
          const _prefix = chalk.white.bold.bgBlack(` ${key} `)

          for (let i = 0; i < byKey[key].length; i++) {
            const issue = byKey[key][i]!

            const prefix = i === 0 ? _prefix : ` `.repeat(_prefix.replace(ANSI, ``).length)
            log.add(prefix)

            log
              .add(` ${chalk.grey.bold(issue.trait._id)}${chalk.grey(`:${issue.trait.section}`)}`)
              .add(` ${issue.expected}`)
              .add(` ${chalk.grey.italic(JSON.stringify(issue.received).substring(0, 150))}`)

              .warn()
          }
        }
      } else {
        // ERROR: Unimplemented issue name
        debugger
      }

      log.tab(-1)
    }
  }

  _getHighestPriority(pipeline?: TraitPipeline, trait?: Trait) {
    let highestPriority = -1

    const pipelines = pipeline ? [pipeline] : TRAIT_PILELINES

    for (const pipeline of pipelines) {
      for (const key of TRAIT_ISSUE_NAMES) {
        const issues = this._issues[pipeline][key] ?? []
        if (issues.length === 0) continue
        if (trait && !issues.some(issue => issue.trait._id === trait._id)) continue

        highestPriority = Math.max(highestPriority, ISSUE_PRIORITY[key])
      }
    }

    return highestPriority
  }

  getHighestPriority(pipeline?: TraitPipeline) {
    return this._getHighestPriority(pipeline)
  }

  getHighestPriorityByTrait(trait: Trait, pipeline?: TraitPipeline) {
    return this._getHighestPriority(pipeline, trait)
  }
}

export type TraitIssuePrintOptions = {
  log?: NullableLogBuilder
  //
  hide?: TraitIssueName[]
  sections?: TraitSection[]
  //
  tags?: {
    abbreviateType?: string[]
    highlight?: string[]
  }
}

function getPrintOptions(options: Partial<TraitIssuePrintOptions> = {}) {
  const log = (options.log ?? churchill.child({ name: `gca` })).builder() //({ separator: `` })

  const HIDE = options.hide ?? []

  const PRINT_TAG_HIGHLIGHT = options.tags?.highlight ?? []

  const PRINT = {
    TAG: {
      HIGHLIGHT: PRINT_TAG_HIGHLIGHT,
      ABBREVIATE_TYPE: (options.tags?.abbreviateType ?? []).filter(t => !PRINT_TAG_HIGHLIGHT.includes(t)),
    },
  }

  return {
    log,
    //
    HIDE,
    //
    PRINT,
  }
}

type TraitIssuePrintConstants = ReturnType<typeof getPrintOptions>

function cappedTraitDebug(issues: TraitIssue[], options: Partial<{ capSize: number; groupByPipeline: boolean }> = {}) {
  const GROUP_BY_PIPELINE = options.groupByPipeline ?? false

  const groupIndex = GROUP_BY_PIPELINE ? groupBy(issues, `pipeline`) : { default: issues }
  const keys = Object.keys(groupIndex)

  const components = [] as string[]
  for (const key of keys) {
    const issues = groupIndex[key]

    let component = _cappedTraitDebug(issues, options)
    if (key !== `default`) component = `${component}::${key}`

    components.push(component)
  }

  return components.join(`, `)
}

function _cappedTraitDebug(issues: TraitIssue[], options: Partial<{ capSize: number; groupByPipeline: boolean }> = {}) {
  const CAP = options.capSize ?? 50
  const JOIN_TRAITS = `,`

  let suffix = ``
  let traits = uniq(issues.map(issue => issue.trait._id))

  // if flat traits passes the cap
  if (traits.join(JOIN_TRAITS).length > CAP) {
    // prepare suffix ( +N)
    const totalNumberOfTraits = traits.length
    suffix = chalk.gray.italic(` x${totalNumberOfTraits}`)

    // cut flat traits to fit cap
    let joinedTraits = traits.join(JOIN_TRAITS).substring(0, CAP - suffix.replace(ANSI, ``).length)

    // if last chat is a comma, just cut it
    if (joinedTraits[joinedTraits.length - 1] === `,`) joinedTraits = joinedTraits.slice(0, joinedTraits.length - 1)

    // split into ids again
    traits = joinedTraits.split(`,`)
  }

  return `[${traits.map(trait => chalk.bold(trait)).join(JOIN_TRAITS)}${suffix}]`
}

function uniqIssueTypes(issues: TraitIssue[]) {
  const _types = [] as string[]
  const types = [] as string[]

  for (const issue of issues) {
    for (const type of issue.types ?? []) {
      const cleanType = type?.replace(ANSI, ``)
      if (_types.includes(cleanType!)) continue

      _types.push(cleanType!)
      types.push(type!)
    }
  }

  return types
}

// eslint-disable-next-line no-control-regex
const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
