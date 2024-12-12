import crypto from "crypto"
import { Instruction, Strategy, Computed, Reference, Reaction } from "@december/compile"
import * as Tree from "../../../../../packages/tree/src"

import { Metadata } from "./../schema"
import { RawTrait } from "./schema"
import { isNameExtensionValid, referenceKeys, Trait } from "./schema/raw"
import { DamageForm, DamageType } from "../../damage"
import { paint } from "../../logger"
import { get, isNil, set } from "lodash"
import CharacterSheet from ".."
import { toTag } from "../../trait/sections/types"
import { computeExpression } from "../interpreter/compute"
import { TAGS } from "./tags"
import { generateGURPSFunctions } from "../interpreter/GURPSFunctions"

const StrategyFactory = new Strategy.Factory<Trait & Metadata<RawTrait>>()

function _injectComputed(self: string, mutations: object, reactions: Reaction.ReactionInstruction[]) {
  return (path: string, value: string, tag: string, symbols: Computed.Object.ScopeSymbolMap) => {
    const computedValue = Computed.Value.ComputedValue.make(path)

    computedValue.symbols = symbols
    computedValue.meta.set(`tag`, tag)

    computedValue.update(value, mutations) // assigns expression and inject parity
    mutations[path] = Instruction.WRITE(path, computedValue)

    // request once reaction for stack:compile:done with computedValueKey (since reaction is added AFTER the update setting _expression, with need this once reaction to unfold computedValue and allow computation in the future)
    const _self: Reference.StrictObjectReference = { type: `id`, id: self }
    reactions.push(...computedValue.instructions(_self, _self, TraitReactiveStrategy.definition(`ComputedValue Expression Changed`, _self)))

    return computedValue
  }
}

/**
 * Late Reaction Flowchart
 * 0. Some reaction's process requires to-be-compiled data (or data that "could not have been" compiled yet)
 * 1. Process request the compiling manager some object (that required data), offering a callback (???)
 * 2. On receiving the request, will add a new reaction, targeting some property in that requested object
 * 3. Once there is an update (or immediately if there is some value/property exists [?????]) that late added reaction is processed
 */

const TraitReactiveStrategy = StrategyFactory.strategy(`trait`).push(
  StrategyFactory.reaction(`_.raw`) //
    .name(`raw`)
    .process(({ _: { raw } }, object, _, characterSheet: CharacterSheet) => {
      // if (raw?.id === 15051) debugger

      if (!raw) return null

      const instructions: Reaction.ReactionInstruction[] = []
      const trait: Trait & Metadata = {
        _: {},
        id: raw.id,
        name: raw.name,
        type: raw.type.toLowerCase() as Trait[`type`],
        active: raw.active,
        //
        points: -Infinity,
        level: -Infinity,
      }

      // NAMEEXT
      if (isNameExtensionValid(raw.nameext)) trait.nameext = raw.nameext

      // POINTS, LEVEL, SCORE
      // TODO: Investigate how to calculate this things
      if (!isNil(raw.points)) trait.points = parseInt(raw.points.toString())
      if (!isNil(raw.level)) trait.level = parseInt(raw.level.toString())
      if (!isNil(raw.score)) trait.score = parseInt(raw.score.toString())

      // ERROR: It is most certainly incorrect
      if (trait.points === -Infinity) debugger
      if (trait.level === -Infinity) debugger

      // MODES
      if (raw.modes?.length) {
        // trait.modes = []
        for (let i = 0; i < raw.modes.length; i++) {
          const _ = raw.modes[i]

          /**
           * How damage works?
           *
           *  damage        — damage value in dice
           *  dmg           — damage form (swing or thrust)
           *  damagebasedon — source for the damage form base value (i.e. where to get value for sw or thr)
           */

          trait[`modes.${i}.name`] = _.name

          const symbols: Computed.Object.ScopeSymbolMap = {}

          if (_.dmg) trait[`modes.${i}.damage.form`] = _.dmg
          if (_.damagebasedon) {
            trait[`modes.${i}.damage.basedOn`] = _.damagebasedon

            // TODO: Generalize this. It is also called inside computeExpression
            const key = _.dmg!
            const id = `${`literal`}×${key}`

            symbols[id] ??= []
            symbols[id].push({
              id,
              key,
              trigger: {
                type: `property`,
                property: {
                  object: { type: `alias`, alias: _.damagebasedon },
                  path: `*`,
                },
                policy: `always`,
              },
              value: {
                type: `function`,
                fn: (data: object | null, characterSheet: CharacterSheet) => {
                  const score = get(data, `score`, null)
                  const damageTable = characterSheet.character.data.damageTable

                  const damage = get(damageTable, score!, null)
                  if (!damage) debugger

                  return damage?.[key]
                },
              },
            })
          }

          const injectComputed = _injectComputed(object.id, trait, instructions)
          if (_.damage) injectComputed(`modes.${i}.damage.value`, _.damage, `damage`, symbols)
          if (_.damtype) injectComputed(`modes.${i}.damage.type`, _.damtype, `damtype`, {})
        }
      }

      // ALIASES
      const aliases = referenceKeys(trait.type, trait.name, trait.nameext)
      trait[`_.aliases`] = Instruction.PUSH(`_.aliases`, aliases)

      // ST:Basic Move
      // if (object.id === `11174`) debugger
      // if (aliases.includes(`ST:Punch`)) debugger

      return [trait, instructions]
    }),
  // TODO: Finish prototype of default reaction for computing values
  StrategyFactory.reaction(/modes.(\d+).damage.type._expression/, /modes.(\d+).damage.value._expression/)
    .name(`ComputedValue Expression Changed`)
    .process((data, object, __, characterSheet: CharacterSheet, { contexts }) => {
      // TODO: Handle multiple valid contexts
      if (contexts.length !== 1) debugger

      const [context] = contexts
      const key = context.hash?.[`computedValueKey`]
      const computedValue = get(data, key) as Computed.Value.ComputedValue<unknown, typeof generateGURPSFunctions>

      // ERROR: Computed Value not found at data (so HOW was this reaction queued?)
      if (!computedValue) debugger

      const instructions: Reaction.ReactionInstruction[] = []
      const trait: Partial<Trait> = {}

      // TODO: only update parity if reaction is due to _expression being changed
      // Update parity (since parity is based on _expression, and it was changed)
      //    TECNICALLY _expression is not changed in the first execution of this reaction (the "once" call after stack compilation), but since nothing should be attached to this parity key it doesn't matter
      //      a proper "fix" for this would be to only update parity IF cause of reaction is a change in _expression
      //      OR to not inject parity upon computedValue creation, only do it here
      // Expression is encapsulated. We can only update it by calling the update method, so the parity should ALREADY be correct. No need to anything here.

      const _tag = computedValue.meta.get(`tag`)
      const tag = TAGS[_tag]

      // ERROR: Tag definition is missing
      if (!tag) debugger

      // Create computedObject (handles all interpretation and shit)
      //    parity stuff is created with computedValue. Whenever the expression is changed
      computedValue.prepare(computeExpression as any, { mode: tag.math ? `math` : `text` })

      // if ready, just set the value, don't even bother with creating reaction instructions
      if (computedValue.object.isReady) {
        computedValue.compute([characterSheet, object.data])

        trait[`${computedValue.key}._timestamp`] = Instruction.WRITE(`${computedValue.key}._timestamp`, (computedValue as any)._timestamp)
        trait[`${computedValue.key}._value`] = Instruction.WRITE(`${computedValue.key}._value`, (computedValue as any)._value)
      }
      // not ready, proxy references to manager
      else {
        // request forwarding reactions to external referenced objects
        //    here source indicates that the instruction will update this very object
        const self: Reference.StrictObjectReference = { type: `id`, id: object.id }
        instructions.push(...computedValue.object.instructions(self, self, TraitReactiveStrategy.definition(`ComputedObject References Found`, self)))
      }

      return [trait, instructions]
    }),
  StrategyFactory.reaction(`fallback//event:ali1ases:ready`) //
    .name(`ComputedObject References Found`)
    .process((data, object, __, characterSheet: CharacterSheet, { contexts }) => {
      // TODO: Handle multiple valid contexts
      if (contexts.length !== 1) debugger

      const [context] = contexts
      const key = context.hash?.[`computedValueKey`]
      const computedValue = get(data, key) as Computed.Value.ComputedValue<unknown, typeof generateGURPSFunctions>

      // ERROR: Computed Value not found at data (so HOW was this reaction queued?)
      if (!computedValue) debugger

      const trait: Partial<Trait> = {}

      const scope: object = {}
      for (const [id, symbols] of Object.entries(computedValue.object.symbols)) {
        const [type, name] = id.split(`×`)

        if (symbols.length !== 1) debugger
        const [{ key, trigger, ...symbol }] = symbols

        if (trigger.type === `property`) {
          if (trigger.property.object.type === `alias`) {
            const reference = characterSheet._._strict(trigger.property.object)

            // ERROR: Cannot find object without id
            if (reference && reference.type !== `id`) debugger

            const id = reference?.id
            const object = characterSheet.getObject(id!)!
            const data = get(object, `data`, null)

            let value: unknown = data
            if (symbol.value.type === `path`) value = get(data ?? {}, symbol.value.path, null)
            else if (symbol.value.type === `function`) value = symbol.value.fn(data, characterSheet)

            scope[key] = value
          } else {
            // ERROR: Unimplemented trigger type
            debugger
          }

          if (trigger.property.path !== `*`) debugger
        } else {
          // ERROR: Unimplemented trigger type
          debugger
        }
      }

      computedValue.compute([characterSheet, object.data, scope])

      trait[`${computedValue.key}._timestamp`] = Instruction.WRITE(`${computedValue.key}._timestamp`, (computedValue as any)._timestamp)
      trait[`${computedValue.key}._value`] = Instruction.WRITE(`${computedValue.key}._value`, (computedValue as any)._value)

      return trait
    }),
)

export default TraitReactiveStrategy
