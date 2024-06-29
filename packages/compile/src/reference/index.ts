/**
 * What is a REFERENCE?
 *    It express where to locate some form of data.
 *    For objects, it is some sort of identificiation: object id, one of its alias or "self" (indicating the object itself, usually where there is other source of reference).
 *    For properties, it is the source object AND the path to it's value. The source object itself is expressed as a reference.
 */

export * as Utils from "./utils"

// OBJECT (type + key)

export const OBJECT_REFERENCE_TYPES = [`self`, `id`, `alias`] as const
export type ObjectReferenceType = (typeof OBJECT_REFERENCE_TYPES)[number]

export const IMPLICIT_OBJECT_REFERENCE_TYPES = [`self`] as const

export interface SelfObjectReference {
  type: `self`
}

export interface AliasObjectReference {
  type: `alias`
  alias: string
}

export interface StrictObjectReference {
  type: `id`
  id: string
}

export type ImplicictObjectReference = SelfObjectReference
export type ExplicitObjectReference = AliasObjectReference | StrictObjectReference
export type ObjectReference = ImplicictObjectReference | ExplicitObjectReference
export type FlatObjectReference = string

// PROPERTY (object + path)

export interface PropertyReference<TPath extends string | RegExp = string | RegExp> {
  object: ObjectReference
  path: TPath
}

export interface ExplicitPropertyReference<TPath extends string | RegExp = string | RegExp> {
  object: ExplicitObjectReference
  path: TPath
}

export interface StrictPropertyReference {
  object: StrictObjectReference
  path: string
}

export interface NonAliasPropertyReference {
  object: Exclude<ObjectReference, AliasObjectReference>
  path: string
}

// REACTION

export interface ReactionDefinitionReference<TObject extends ObjectReference = ObjectReference> {
  object: TObject // object where the strategy is located (only EXPLICIT OBJECTS SHOULD BE ALLOWED IN A RUN)
  strategy: string
  name: string // definition name under strategy
}

/**
 * Instructions can be declared in two ways:
 *
 * - Inside a strategy, at the implementation (manually)
 * - Dinamically, usually as a necessity to track compiled data (dinamically)
 *
 * Manual instructions are always inside a strategy (and are always Implicit).
 * Dinamic instructions are always kept inside the local strategy for an object (and are always Explicit, since we know the object id when creating them).
 *    They name must be defined in code, usually a template string (e.g. `reaction--${property.path}` or something like it)
 *    They also have associated parity data, to determine when the instruction should be removed from local strategy
 */
export interface ReactionInstructionReference<TObject extends ObjectReference = ObjectReference> {
  object: TObject
  strategy: string
  name: string // for manually declared instructions it is the same name of the associated reaction definition
}

export type FlatReactionInstructionReference = string

/**
 * A Reaction Trigger Reference is the address to locate a specific reaction instruction target.
 *
 * Triggers are defined within ReactionInstructions, connecting them to objects and reaction definitions (its processing functions)
 *   They are the patterns that the reaction is following, waiting for an update on.
 */
export interface ReactionTriggerReference {
  instruction: ReactionInstructionReference<StrictObjectReference>
  index: number // trigger index inside instruction
}

// STRATEGY (object + strategy)

export interface StrategyReference<TObject extends ObjectReference = StrictObjectReference> {
  object: TObject
  strategy: string
}

export type FlatStrategyReference = string
