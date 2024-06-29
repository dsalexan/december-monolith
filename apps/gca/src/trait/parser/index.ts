/* eslint-disable no-debugger */
import { isNilOrEmpty } from "@december/utils"
import { cloneDeep, isEqual, isNil, last, max, min, range, uniq, unzip } from "lodash"

import loggerFactory from "../../logger"
import { DEFAULT_SYNTAX_COMPONENTS, SYNTAX_COMPONENTS, SyntaxComponent, SyntaxName } from "./syntax"
import chalk from "chalk"
import TraitTag from "../tag"
import { Node } from "./node"
// import LogBuilder from "@december/churchill/src/builder"
import { NodeResolveOptions } from "./node/resolver"

export const logger = loggerFactory.child(`parser`)

export const TRAIT_CLASSIFICATION = [
  `traits_with_damage_modes`,
  `modifiers_that_add_new_damage_modes`,
  `traits`,
  `templates`,
  `equipment`,
  `attributes`,
  `parent_traits`,
  `traits_and_modifiers`,
  `advantages_perks_disadvantages_quirks_templates_modifiers`,
  `skills_and_spells`,
  `traits_other_than_equipment`,
  `modifiers`,
  `any`,
] as const

export type TraitClassification = (typeof TRAIT_CLASSIFICATION)[number]

export class TraitParser {
  text: string

  // node
  root: Node
  baseSyntaxes: SyntaxComponent[]

  constructor(text: string, syntaxes?: SyntaxComponent[]) {
    this.text = text

    this.root = new Node(this, null, `root` as any, 0, SYNTAX_COMPONENTS.imaginary)

    this.baseSyntaxes = syntaxes ?? DEFAULT_SYNTAX_COMPONENTS
  }

  syntaxes(syntaxes: SyntaxName[] = []) {
    const bothSyntaxes = [...this.baseSyntaxes, ...syntaxes.map(name => SYNTAX_COMPONENTS[name])]

    return Object.fromEntries(bothSyntaxes.map(syntax => [syntax.name, syntax])) as Record<SyntaxName, SyntaxComponent>
  }

  characterSet(syntaxes: SyntaxName[] = []) {
    const allSyntaxes = this.syntaxes(syntaxes)

    return uniq(
      Object.values(allSyntaxes)
        .map(syntax => (syntax as any).set ?? [])
        .flat(),
    ) as string[]
  }

  getSyntaxFromCharacter(syntaxes: SyntaxName[] = []) {
    const allSyntaxes = Object.values(this.syntaxes(syntaxes))

    const SYNTAX_FROM_CHARACTER = Object.fromEntries(
      allSyntaxes
        .map(component => {
          const set = ((component as any).set ?? []) as string[]

          return set.map(character => [character, component])
        })
        .flat(),
    ) as Record<string, SyntaxComponent>

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return function (index: number) {
      const character = self.text[index]
      let syntax = SYNTAX_FROM_CHARACTER[character]

      if (syntax) {
        if (syntax.name === `math_operator`) {
          if (character === `x`) {
            // super special case pain in my ass holy fk
            let firstRelevantCharacterBefore = 0
            for (let i = index - 1; i >= 0; i--) {
              if (SYNTAX_FROM_CHARACTER[self.text[i]]) {
                firstRelevantCharacterBefore = i
                break
              }
            }

            let firstRelevantCharacterAfter = 0
            for (let i = index + 1; i < self.text.length; i++) {
              if (SYNTAX_FROM_CHARACTER[self.text[i]]) {
                firstRelevantCharacterAfter = i
                break
              }
            }

            const substring = self.text.substring(firstRelevantCharacterBefore + 1, firstRelevantCharacterAfter)

            const _x = [
              //
              /^ x$/,
              /^x $/,
              /^x\d+$/,
              /^x$/,
            ]

            const matches = _x.map(pattern => substring.match(pattern))

            if (matches.every(m => isNil(m))) syntax = undefined as any
            else {
              // ERROR: Untested
              debugger
            }
          }
        }
      }

      return syntax
    }
  }

  toString() {
    return `<tree#${this.root.id}>`
  }

  get(context: string) {
    return this.root.get(context)
  }

  printText() {
    const characters = [...this.text]
    const charactersAndIndexes = characters.map((character, index) => [index, character])

    const separatorSize = this.text.length.toString().length

    const [indexes, allCharacters] = unzip(charactersAndIndexes) as [number[], string[]]
    logger.add(chalk.grey(indexes.map(index => index.toString().padEnd(separatorSize)).join(` `))).debug()
    logger.add(chalk.grey(allCharacters.map(character => character.padEnd(separatorSize)).join(` `))).debug()
  }

  parse(log?: typeof loggerFactory, options: Partial<NodeResolveOptions> = {}) {
    // if (log) log.add(`parsing...`).debug({ duration: true })
    this.root.resolve({ log, ...options })
    // if (log) log.add(`resolve`).debug({ duration: true })
    this.root.simplify()
    // if (log) log.add(`simplify`).debug({ duration: true })
    this.root.normalize()
    // if (log) log.add(`normalize`).debug({ duration: true })
    this.root.specialize({ log, ...options })
    // if (log) log.add(`specialize`).debug({ duration: true })

    return true
  }
}
