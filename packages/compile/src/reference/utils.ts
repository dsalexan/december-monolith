import { object } from "zod"
import {
  ExplicitObjectReference,
  FlatObjectReference,
  ImplicictObjectReference,
  IMPLICIT_OBJECT_REFERENCE_TYPES,
  ObjectReference,
  ObjectReferenceType,
  PropertyReference,
  ReactionDefinitionReference,
  ReactionInstructionReference,
  ReactionTriggerReference,
  SelfObjectReference,
  StrategyReference,
  StrictObjectReference,
  StrictPropertyReference,
} from "."
import { cloneDeep, isNil } from "lodash"
import type ReactiveCompilableObject from "../reactive/object"

// #region OBJECT

export const Object = {
  unflatten,
  flatten,
  isSelf,
  isEqual,
  isStrict: isStrictObject,
  isImplicit,
  strictify,
}

function unflatten<TObject extends ObjectReference = ObjectReference>(flat: FlatObjectReference): TObject {
  const index = flat.indexOf(`:`)
  const type = flat.slice(0, index) as ObjectReferenceType
  const key = flat.slice(index + 1)

  if (type === `self`) return { type } as TObject
  else if (type === `id`) return { type, id: key } as TObject
  else if (type === `alias`) return { type, alias: key } as TObject

  // ERROR: Unknown object reference type
  debugger

  return null as any
}

function flatten(object: ObjectReference): FlatObjectReference {
  if (object.type === `self`) return object.type
  else if (object.type === `id`) return `${object.type}:${object.id}`
  else if (object.type === `alias`) return `${object.type}:${object.alias}`

  // ERROR: Unknown object reference type
  debugger

  return null as any
}

function isEqual(a: ObjectReference, b: ObjectReference): boolean {
  // self doesn't require a key
  if (isSelf(a) && isSelf(b)) return true

  // @ts-ignore
  return a.type === b.type && a.key === b.key
}

function isSelf(object: ObjectReference): object is SelfObjectReference {
  return object.type === `self`
}

function isStrictObject(reference: ObjectReference): reference is StrictObjectReference {
  return reference.type === `id`
}

function isImplicit(reference: ObjectReference): reference is ImplicictObjectReference {
  return IMPLICIT_OBJECT_REFERENCE_TYPES.includes(reference.type as ImplicictObjectReference[`type`])
}

function strictify(object: ObjectReference, self?: ReactiveCompilableObject[`id`]): StrictObjectReference {
  let strictObject: StrictObjectReference = cloneDeep(object) as StrictObjectReference
  if (!isStrictObject(object)) {
    if (object.type === `self`) {
      if (!self) {
        // ERROR: ObjectID for self not informed
        debugger
      }

      strictObject = { type: `id`, id: self! }
    } else {
      // ERROR: Object reference type unimplemented
      debugger
    }
  }

  return strictObject
}

// #endregion

// #region REFERENCE

export const Property = {
  isStrict: isStrictProperty,
  flatten: flattenProperty,
}

function isStrictProperty(reference: PropertyReference): reference is StrictPropertyReference {
  return isStrictObject(reference.object) && typeof reference.path === `string` && reference.object.type === `id`
}

function flattenProperty(reference: PropertyReference): string {
  return `${Object.flatten(reference.object)}:${reference.path}`
}

// #endregion

// #region REACTION

export const Reaction = {
  unflatten: unflattenReactionStructure,
  flatten: flattenReactionStructure,
  explicitize: explicitizeReactionStructure,
}

function unflattenReactionStructure<TObject extends ReactionDefinitionReference | ReactionInstructionReference>(flat: string): TObject {
  const I = flat.indexOf(`::`)
  const object = unflatten(flat.slice(0, I))

  const _flat = flat.slice(I + 2)
  const J = _flat.indexOf(`:`)
  const strategy = _flat.slice(0, J)
  const name = _flat.slice(J + 1)

  return { object, strategy, name } as TObject
}

function flattenReactionStructure<TObject extends ReactionDefinitionReference | ReactionInstructionReference>(definition: TObject) {
  return `${flatten(definition.object)}::${definition.strategy}:${definition.name}`
}

function explicitizeReactionStructure<TExplicitObject extends ExplicitObjectReference>(structure: ReactionInstructionReference, object?: TExplicitObject): ReactionInstructionReference<TExplicitObject>
function explicitizeReactionStructure<TExplicitObject extends ExplicitObjectReference>(structure: ReactionDefinitionReference, object?: TExplicitObject): ReactionDefinitionReference<TExplicitObject>
function explicitizeReactionStructure<TExplicitObject extends ExplicitObjectReference, TObject extends ReactionDefinitionReference | ReactionInstructionReference>(structure: TObject, object?: TExplicitObject): TObject {
  let explicitStructure: TObject = cloneDeep(structure)

  if (isImplicit(structure.object)) {
    // ERROR: Informed explicit object is implicit
    if (isNil(object) || isImplicit(object)) debugger

    explicitStructure.object = cloneDeep(object!)
  }

  return explicitStructure
}

// #endregion

// #region STRATEGY

export const Strategy = {
  unflatten: unflattenStrategy,
  flatten: flattenStrategy,
}

function unflattenStrategy(flat: string): StrategyReference {
  const index = flat.indexOf(`::`)
  const objectID = flat.slice(0, index)
  const strategy = flat.slice(index + 1)

  return { object: { type: `id`, id: objectID }, strategy }
}

function flattenStrategy(strategy: StrategyReference | ReactionDefinitionReference<StrictObjectReference>) {
  if (strategy.object.type !== `id`) debugger

  return `${strategy.object.id}::${strategy.strategy}`
}

// #endregion

// #region TRIGGER

export const Trigger = {
  unflatten: unflattenTrigger,
  flatten: flattenTrigger,
}

function unflattenTrigger(flat: string): ReactionTriggerReference {
  const i = flat.indexOf(`:::`)
  const _instruction = flat.slice(0, i)
  const index = parseInt(flat.slice(i + 1))

  return { instruction: unflattenReactionStructure(_instruction), index }
}

function flattenTrigger(trigger: ReactionTriggerReference) {
  const _instruction = flattenReactionStructure(trigger.instruction)

  return `${_instruction}:::${trigger.index}`
}

// #endregion
