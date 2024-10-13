import { v4 as uuidv4 } from "uuid"
import assert from "assert"
import { isNil, isNumber, set } from "lodash"

import { Strategy, Mutation, Signature, SET, OVERRIDE, ListenerFunctionContext, ReferenceIndexedEvent_Handle, DYNAMIC_MUTATION_HASH } from "@december/compiler"
import { PreProcessValueOptions, ProcessingOptions } from "@december/compiler/processor"
import { ProcessingOptionsGenerator } from "@december/compiler/strategy"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, Reference, REFERENCE } from "@december/utils/access"

import { MasterScope } from "@december/tree"
import { Dice } from "@december/system"
import { UNIT_MANAGER } from "@december/system/units"

import { GCACharacter } from "@december/gca"
import { GCATrait } from "@december/gca/trait"

import { IGURPSCharacter, IGURPSTrait } from "@december/gurps"
import { fromGCASection } from "@december/gurps/trait/type"
import { getAliases, isAlias, isNameExtensionValid } from "@december/gurps/trait"
import IGURPSTraitMode from "@december/gurps/trait/mode"
import { Damage } from "@december/gurps/mechanics"

const GCABaseProcessingOptions: Omit<ProcessingOptions, `referenceToSource`> = {
  isProxiableIdentifier: ({ content, value }) => isAlias(value),
  // TODO: It is not always going to be "level"
  identifierSymbolToPropertyPattern: ({ content, value }) => PROPERTY(REFERENCE(`alias`, value), `level`),
}

const GCAProcessingOptionsGenerator: ProcessingOptionsGenerator =
  object =>
  ({ manager }) => ({
    referenceToSource: referenceKey => {
      const [object] = manager.objects.getByReference(new Reference(`alias`, referenceKey))

      // if reference is found
      // TODO: It is not always going to be "level"
      if (object && !isNil(object.data.level)) return { [referenceKey]: object.data.level }

      return null
    },
    ...GCABaseProcessingOptions,
  })

const GCAPreProcessingOptionsGenerator: (rootScope: MasterScope) => PreProcessValueOptions = (rootScope: MasterScope) => ({
  scope: rootScope,
  debug: false,
  //
  ...GCABaseProcessingOptions,
})

export const IMPORT_TRAIT_FROM_GCA_STRATEGY = new Strategy() //
  .onUpdatePropertyMutatingFunction(
    [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA`)], //
    `GCA:initialize`,
    (object, strategy) =>
      ({ manager: character }) => {
        const preProcess = strategy.preProcess(object, character.eventEmitter, UNIT_MANAGER)
        const proxy = strategy.proxy(object, character.eventEmitter)

        const instructions: Mutation[] = []

        const _trait = object.data._.GCA as GCATrait

        const trait: Omit<IGURPSTrait, `modes`> = {
          name: _trait.name,
          type: fromGCASection(_trait.section),
          active: _trait.active,
          //
          points: NaN,
          level: NaN,
        }

        // NAMEEXT
        if (isNameExtensionValid(_trait.nameext)) trait.nameExtension = _trait.nameext

        // POINTS, LEVEL, SCORE
        // TODO: Investigate how to calculate this things
        if (!isNil(_trait.points)) trait.points = parseInt(_trait.points.toString())
        if (!isNil(_trait.level)) trait.level = parseInt(_trait.level.toString())
        if (!isNil(_trait.score)) trait.score = parseInt(_trait.score.toString())

        assert(isNumber(trait.points), `Points should be a number`)
        assert(isNumber(trait.level), `Level should be a number`)
        assert(isNumber(trait.score) || trait.score === undefined, `Score should be a number`)

        // MODES
        const M = _trait.modes?.length ?? 0
        for (let i = 0; i < M; i++) {
          /**
           * How damage works?
           *
           *  damage        — damage value in dice
           *  dmg           — damage form (swing or thrust)
           *  damagebasedon — source for the damage form base value (i.e. where to get value for sw or thr)
           */
          const _mode = _trait.modes![i]

          const mode: Omit<IGURPSTraitMode, `damage`> & { damage: Omit<IGURPSTraitMode[`damage`], `form` | `type` | `value`> } = {
            name: _mode.name,
            damage: {
              basedOn: _mode.damagebasedon!,
              // form: Damage.Form.fromGCA(_mode.dmg!),
              // type: Damage.Type.fromGCA(_mode.damtype!),
              // value: _mode.damage!,
            },
          }

          instructions.push(SET(`modes.[${i}]`, mode))

          // basedOn attribute is necessary to calculate base thr or sw
          proxy({ type: `reference:indexed`, references: [REFERENCE(`alias`, mode.damage.basedOn)], data: { mode: i } }, `compute:mode`)

          const damageForm = preProcess({ path: [`_.GCA.modes[${i}].dmg`, `modes[${i}].form`] }, `compute:mode`, GCAPreProcessingOptionsGenerator(`math-enabled`))
          const damageType = preProcess({ path: [`_.GCA.modes[${i}].damtype`, `modes[${i}].type`] }, `compute:mode`, GCAPreProcessingOptionsGenerator(`math-enabled`))
          const damageValue = preProcess({ path: [`_.GCA.modes[${i}].damage`, `modes[${i}].value`] }, `compute:mode`, GCAPreProcessingOptionsGenerator(`math-enabled`))

          instructions.push(...damageForm, ...damageType, ...damageValue)
        }

        // ALIASES
        const aliases = getAliases(trait.type, trait.name, trait.nameExtension)
        instructions.push(SET(`__.aliases`, aliases))

        for (const [key, value] of Object.entries(trait)) instructions.push(SET(key, value))
        return instructions
      },
  )
  .addFunction(`compute:mode`, object => ({ manager: character, event, data }: ListenerFunctionContext<ReferenceIndexedEvent_Handle>) => {
    debugger

    const [target] = character.objects.getByReference(event.reference)
    if (!target) return

    character.mutator.enqueue(
      event.reference, //
      {
        name: `compute:mode`,
        fn: () => {
          const instructions: Mutation[] = []
          debugger

          return instructions
        },
      },
      { event },
      DYNAMIC_MUTATION_HASH.EVENT_DATA,
    )
  })
