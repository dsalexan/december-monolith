import { isNilOrEmpty, typing } from "@december/utils"

import type ReactiveCompilationManager from "./index"
import type { Strategy } from "../../strategy"
import type ReactiveCompilableObject from "../object"

import * as Utils from "../../reference/utils"

import {
  AliasObjectReference,
  ExplicitObjectReference,
  ExplicitPropertyReference,
  FlatObjectReference,
  FlatReactionInstructionReference,
  NonAliasPropertyReference,
  ObjectReference,
  ReactionDefinitionReference,
  ReactionInstructionReference,
  ReactionTriggerReference,
  StrictObjectReference,
  StrictPropertyReference,
} from "../../reference"
import { cloneDeep, get, isArray, isEqual, isNil, last, orderBy, remove, set, sum, toPath, uniq } from "lodash"
import { EventCalled, PropertyUpdated, ReactionContext } from "../reaction/context"
import { ParallelReaction, ParallelReactionData } from "../reaction"
import { ReactionInstruction } from "../reaction/definition"
import { ParityKey } from "../parity"
import { EventTrigger, PropertyTrigger, ReactionPolicy, ReactionTrigger } from "../reaction/triggers"

interface PatternClusteredIndex<TReference> {
  pattern: RegExp
  list: TReference[]
}

// interface IndexedTarget {
//   priority: number
//   target: ReactionTargetReference<StrictObjectReference> // always strict, since a object asks for indexation, so we KNOW the correct id to index under
//   definition: ReactionDefinitionReference
// }

type Prioritized<TObject> = TObject & { priority: number }

type ParallelTrigger = Prioritized<ReactionTriggerReference> & { data: ParallelReactionData }

// interface PrioritizedParallelReaction {
//   priority: number
//   reaction: ParallelReaction
// }

// interface PrioritizedStrategy {
//   strategy: Strategy
//   priority: number
// }

export interface FetchOptions {
  useVariants: boolean
}

/** Object with awareness of its own path */
type PathAware<T> = T & { _path: string }

export default class ReactiveIndexation {
  manager: ReactiveCompilationManager

  /**
   * TODO: New indexes
   *
   * (reverse) key -> regular/variant index paths
   * by source - for when we remove an object, to remove ALL associated instructions
   * by instruction - for when we remove an instruction (like for outdated parity) (the old "forwarding" implementation)
   * by parity - for when a parity is changed, so all instructions with that parity can be easily removed
   *
   * [DONE] (priority) I will remove priority index from here, it is really confusing and i'm seing no reason for the source object (parent of instruction) not to keep the priority of its own strategies
   *
   * (variants) object reference -> object id ("strict object reference")
   * by object reference - to find the many variants (id, alias, etc...) of an object reference (the old "references" implementation)
   *
   * (targets) key -> Index<ReactionTargetReference>
   * by string path -> target object being watched -> watched string properties
   * by regex path -> target object being watched -> watched regex properties
   */

  /**
   * The compilation manager has all the objects, here we just index them to make my days something less of a living hell
   *
   */
  reverse: {
    // index path ->  PARTIAL reverse index path[]
    //        "partial reverse index path" means we keep the entire reverse path BUT the final index (to remove we loop through the entire list and remove the matching path, it is easier to maintain)
    byIndexPath: Record<string, string[]>
    //
    bySource: Record<ReactiveCompilableObject[`id`], string[]> // object id -> index path[]
    byParity: Record<string, string[]> // parity key -> index path[]
    //  here we add source to key, since generic strategies (like "trait") should execute the same instruction (whose name is unique within the strategy) across N traits (which would
    //   end up repeting the instruction names at manager level)
    byInstruction: Record<FlatReactionInstructionReference, string[]> // flat instruction reference -> index path[]
    byPolicy: {
      byInstruction: {
        // policy -> instruction reference -> trigger index -> index path[]
        //    stores all triggers by policy, so we can easily remove all triggers with a certain policy (usually "once" policy)
        byTrigger: Partial<Record<ReactionPolicy, Record<FlatReactionInstructionReference, Record<number, string[]>>>>
      }
    }
  }
  variants: {
    // it always returns a ID, since the values are always what is being indexed
    //    we store the flat version to avoid unnecessary processing (since most of the time we use flat variety as keys)
    byObjectReference: Record<FlatObjectReference, PathAware<{ reference: FlatObjectReference }>[]> // flat object reference -> flat explicit object reference[]
  }
  instructions: {
    byParent: {
      byParity: Record<string, Record<string, PathAware<{ reference: FlatReactionInstructionReference }>[]>> // strict parent id -> parity key -> (instruction)[]
    }
  }
  triggers: {
    // flat object reference -> [...]
    //    object is first level because it is the reference of the watched object (nothing to do with instruction OR definition)
    byObject: {
      byStringPath: Record<FlatObjectReference, Record<string, PathAware<Prioritized<ReactionTriggerReference>>[]>> // object -> path(string) -> (instruction, trigger)[]
      // "PatternClusteredIndex" is a structure to hold the regex pattern AND allow for indexation inside a record
      byRegexPath: Record<FlatObjectReference, Record<string, PatternClusteredIndex<PathAware<Prioritized<ReactionTriggerReference>>>>> // object -> regex path key -> (instruction, trigger)[]
    }
    byEvent: Record<string, PathAware<Prioritized<ReactionTriggerReference>>[]> // event name -> (instruction, trigger)[]
  }

  constructor(manager: ReactiveCompilationManager) {
    this.manager = manager

    // initialize indexes
    this.reverse = {
      byIndexPath: {},
      bySource: {},
      byParity: {},
      byInstruction: {},
      byPolicy: {
        byInstruction: {
          byTrigger: {},
        },
      },
    }
    this.variants = {
      byObjectReference: {},
    }
    this.instructions = {
      byParent: {
        byParity: {},
      },
    }
    this.triggers = {
      byObject: {
        byStringPath: {},
        byRegexPath: {},
      },
      byEvent: {},
    }
  }

  /** Return strict reference from explicit one */
  _strict(object: ExplicitObjectReference): StrictObjectReference | null
  _strict(object: ObjectReference, self?: ReactiveCompilableObject[`id`]): StrictObjectReference | null
  _strict(object: ObjectReference, self?: ReactiveCompilableObject[`id`]): StrictObjectReference | null {
    let id: string = get(object, `id`)! as string

    if (isNil(id)) {
      if (object.type === `self`) {
        // ERROR: Self is not informed in arguments
        if (isNilOrEmpty(self)) debugger

        id = self!
      } else {
        // ERROR: Object reference is not explicit
        if (Utils.Object.isImplicit(object)) debugger

        const _object = Utils.Object.flatten(object)
        const variants = this.variants.byObjectReference[_object] ?? []

        const ids = variants.filter(({ reference }) => reference.startsWith(`id:`)).map(({ reference }) => reference)

        if (ids.length === 0) return null

        // WARN: Never tested
        if (ids.length > 1) debugger

        const reference = Utils.Object.unflatten(ids[0]) as StrictObjectReference
        id = reference.id
      }
    }

    return { type: `id`, id }
  }

  /** Return all variants (argument included) for a explicit object reference */
  _variants(object: ExplicitObjectReference): FlatObjectReference[] {
    const _object = Utils.Object.flatten(object)
    const _variants = this.variants.byObjectReference[_object] ?? []
    const variants: FlatObjectReference[] = [_object, ..._variants.map(({ reference }) => reference)]

    return uniq(variants)
  }

  /** Index a list/index of prioritized strategies */
  index(object: ReactiveCompilableObject, strategies: { priority: number; strategy: Strategy<object> }[] | Record<string, { priority: number; strategy: Strategy<object> }>) {
    const listOfStrategies: { priority: number; strategy: Strategy<object> }[] = Array.isArray(strategies) ? strategies : Object.values(strategies)

    // update (actually properly indexing since it is the first time) indexes for strategy, reactions and objects
    //    ignore priority since it should have been already indexed above
    const report = this.update(object, ...listOfStrategies)

    return report
  }

  /** Update optim indexes. If no strategies are passed, only object referential index is updated */
  update(object: ReactiveCompilableObject, ...strategies: { priority: number; strategy: Strategy<object> }[]) {
    // update object indexes
    const report = this._index_object(object)

    // update strategy/reaction/target indexes
    //    ignore priority since it should have been already indexed in "index(...)"
    for (const { strategy, priority } of strategies) {
      for (const instruction of Object.values(strategy.instructions)) {
        this._index_instruction(object, instruction, priority)
      }
    }

    // Only update hash is new alias was registered OR removed (basically when there is an operation is in index)
    this.manager.objectReferentialOperations.current += sum(Object.values(report).map(({ length }) => length))

    return report
  }

  /** Object object referential index (alias -> id, id -> alias, etc...) */
  _index_object(object: ReactiveCompilableObject) {
    const id = object.id
    const aliases = get(object.data, `_.aliases`, []) as string[]

    const ID: ObjectReference = { type: `id`, id }

    const report: { added: string[]; removed: string[]; shifted: string[] } = { added: [], removed: [], shifted: [] }

    // 1. for each alias, build N:N mapping
    const pairs: [FlatObjectReference, FlatObjectReference][] = []
    for (const alias of aliases) {
      const ALIAS: AliasObjectReference = { type: `alias`, alias }

      pairs.push([Utils.Object.flatten(ID), Utils.Object.flatten(ALIAS)]) // id -> alias
      pairs.push([Utils.Object.flatten(ALIAS), Utils.Object.flatten(ID)]) // alias -> id
    }

    // 2. store current indexation (to compare later to see if there were any operations changing it)
    const _bySource = this.reverse.bySource[id] ?? []
    const oldIndexation = _bySource.filter(path => path.startsWith(`variants.byObjectReference`))

    // 2.5. check if there is any difference before removing/adding shit
    const _newReferences = uniq(pairs.flat()).sort()
    const _oldReferences = oldIndexation.map(path => toPath(path)[2]).sort()

    const thereArePendingOperations = !isEqual(_newReferences, _oldReferences)

    if (thereArePendingOperations) {
      if (oldIndexation.length > 0) debugger

      // 3. remove old mappings
      //      all indexes have a their reverse index path, so when we remove a mapping we can easily recalculate all index positions in lists AND update the reverse indexes
      for (const path of oldIndexation) {
        const arrayPath = toPath(path) // ["objects", "byReference", A, B_index] = B
        const { _path } = get(this, path) as PathAware<FlatObjectReference>

        // ERROR: Path awareness not working
        if (path !== _path) debugger

        debugger
        // 3.1 remove from indexation
        const _element = parseInt(last(arrayPath)!)
        const _list = arrayPath.slice(0, -1)
        const list = get(this, _list) as PathAware<unknown>[]

        // ERROR: List is not a list
        if (!isArray(list)) debugger

        const _removed_element = list.splice(_element, 1)
        report.removed.push(``)

        // 3.2 update reverse index of following elements in list (too keep double biding consistent)
        for (let i = _element; i < list.length; i++) {
          debugger
          // get reverse index path
          const { _path: _oldPath } = list[i]

          debugger
          // generate new path based on new index
          const K = _oldPath.lastIndexOf(`.[`) // character where index ".[\d+]" starts
          const _newPath = `${_oldPath.substring(0, K)}.[${i}]`

          // update reverse indexes with this new path
          const reverse = this.reverse.byIndexPath[_oldPath] ?? [] // returns all reverse indexes with old path
          for (const reversePath of reverse) {
            // reversePath is partial, lacking the final index of path

            // remove old path from list
            const list = get(this, reversePath)
            remove(list, p => p === _oldPath)

            // add new path
            list.push(_newPath)
          }

          report.shifted.push(``)
        }

        // 3.3 since path is removed, remove from reverse index also
        const reversePaths = this.reverse.byIndexPath[path] ?? []
        for (const reversePath of reversePaths) {
          // reversePath is partial, lacking the final index of path
          const list = get(this, reversePath)
          remove(list, p => p === path)
        }
      }

      // 4.1 add new mappings
      const indexPaths: string[] = []
      for (const [A, B] of pairs) {
        indexPaths.push(...this._index_objects_byReference(A, B))

        report.added.push(B)
      }

      // 4.2 reverse index by source (since instruction and parity have no bearing in object referential variants)
      for (const path of indexPaths) this._index_reverse_bySource(id, path)
    }

    return report
  }

  /**
   * Index Instruction (by priority)
   */
  _index_instruction(object: ReactiveCompilableObject, instruction: ReactionInstruction, priority: number) {
    const { parity } = instruction

    // 1. get strict instruction parent object
    const parent = Utils.Object.strictify(instruction.parent.object, object.id)

    // ERROR: Instruction is already indexed. WHY and HOW???
    if (!this._should_index_instruction(object, instruction, priority)) debugger

    // 1.5. index instruction by parity
    if (parity) {
      const paths = this._index_instructions_byParity(instruction.toReference(parent), parity.key)

      // reverse index by parity
      for (const path of paths) this._index_reverse_byParity(parity.key, path)
    }

    // 2. for each trigger, index the "watching" for a certain pattern
    for (const [_trigger_index, _trigger] of instruction.triggers.get().entries()) {
      // check if _index matches
      if (_trigger_index !== _trigger._index) debugger

      // 2.1. build trigger reference
      const TRIGGER: ReactionTriggerReference = instruction.getTriggerReference(_trigger_index, parent)
      const PRIORITIZED_TRIGGER: Prioritized<ReactionTriggerReference> = { ...TRIGGER, priority }

      /**
       *
       * (reverse) key -> regular/variant index paths
       * by source - for when we remove an object, to remove ALL associated instructions
       * by instruction - for when we remove an instruction (like for outdated parity) (the old "forwarding" implementation)
       * by parity - for when a parity is changed, so all instructions with that parity can be easily removed
       *
       * [DONE] (priority) I will remove priority index from here, it is really confusing and i'm seing no reason for the source object (parent of instruction) not to keep the priority of its own strategies
       *
       * (variant) object reference -> object referent
       * by object reference - to find the many variants (id, alias, etc...) of an object reference (the old "references" implementation)
       *
       * (targets) key -> Index<ReactionTargetReference>
       * by object -> object being watched
       *    by string path -> watched string properties
       *    by regex path -> watched regex properties
       *
       * by event -> event -> (instruction, trigger)[]
       */

      const indexPaths: string[] = []

      // 2.3. properly index trigger by type
      if (_trigger.type === `event`) indexPaths.push(...this._index_triggers_byEvent(_trigger.name, PRIORITIZED_TRIGGER))
      else if (_trigger.type === `property`) {
        // make sure property is explicit
        let property: ExplicitPropertyReference = cloneDeep(_trigger.property) as ExplicitPropertyReference
        if (_trigger.property.object.type === `self`) property.object = { type: `id`, id: object.id }

        if (typeof property.path === `string`) indexPaths.push(...this._index_triggers_byObject_StringPath(property, PRIORITIZED_TRIGGER))
        else indexPaths.push(...this._index_triggers_byObject_RegexPath(property, PRIORITIZED_TRIGGER))
      }

      // 2.4. reverse index new indexes
      for (const path of indexPaths) {
        this._index_reverse_bySource(object.id, path) // reverse index by source
        // here I use implicitInstruction to make sure future me understands that the important part is the instruction name (that should be unique anyways), not the implicity of the instruction source
        this._index_reverse_byInstruction(instruction.toReference(parent), path) // reverse index by instruction

        this._index_reverse_byPolicy(_trigger, instruction.toReference(parent), path) // reverse index by policy
      }
    }
  }

  /**
   * Check if instruction should be indexed
   */
  _should_index_instruction(object: ReactiveCompilableObject, instruction: ReactionInstruction, priority: number) {
    // 1. get strict instruction parent object
    const parent = Utils.Object.strictify(instruction.parent.object, object.id)
    const _instruction = instruction.toReference(parent)
    const key = Utils.Reaction.flatten(_instruction)

    const indexes = this.reverse.byInstruction[key] ?? []

    if (indexes.length > 0) debugger

    return indexes.length === 0
  }

  // #region STRUCTURAL INDEXING

  _index_reverse_bySource(source: ReactiveCompilableObject[`id`], path: string) {
    this.reverse.bySource[source] ??= []
    this.reverse.bySource[source].push(path)

    // reverse index path
    this.reverse.byIndexPath[path] ??= []
    this.reverse.byIndexPath[path].push(`reverse.bySource.["${source}"]`)
  }

  _index_reverse_byInstruction(instruction: ReactionInstructionReference<StrictObjectReference>, path: string) {
    const key = Utils.Reaction.flatten(instruction)

    this.reverse.byInstruction[key] ??= []
    this.reverse.byInstruction[key].push(path)

    // reverse index path
    this.reverse.byIndexPath[path] ??= []
    this.reverse.byIndexPath[path].push(`reverse.byInstruction.["${key}"]`)
  }

  _index_reverse_byPolicy(trigger: typing.Indexed<ReactionTrigger>, instruction: ReactionInstructionReference<StrictObjectReference>, path: string) {
    const _instruction = Utils.Reaction.flatten(instruction)

    this.reverse.byPolicy.byInstruction.byTrigger[trigger.policy] ??= {}
    this.reverse.byPolicy.byInstruction.byTrigger[trigger.policy]![_instruction] ??= {}
    this.reverse.byPolicy.byInstruction.byTrigger[trigger.policy]![_instruction]![trigger._index] ??= []

    const list = this.reverse.byPolicy.byInstruction.byTrigger[trigger.policy]![_instruction]![trigger._index]

    list.push(path)

    // reverse index path
    this.reverse.byIndexPath[path] ??= []
    this.reverse.byIndexPath[path].push(`reverse.reverse.byPolicy.byInstruction.byTrigger["${trigger.policy}"]["${_instruction}"]["${trigger._index}"]`)
  }

  _index_reverse_byParity(key: ParityKey, path: string) {
    this.reverse.byParity[key] ??= []
    this.reverse.byParity[key].push(path)

    // reverse index path
    this.reverse.byIndexPath[path] ??= []
    this.reverse.byIndexPath[path].push(`reverse.byParity.["${key}"]`)
  }

  _index_objects_byReference(A: FlatObjectReference, B: FlatObjectReference): string[] {
    const list = (this.variants.byObjectReference[A] ??= [])

    // create reverse index path to store inside reference
    const index = list.length
    const _path = `variants.byObjectReference.["${A}"].[${index}]`

    // inject reverse index in reference
    list.push({ reference: B, _path })

    return [_path]
  }

  _index_instructions_byParity(instruction: ReactionInstructionReference<StrictObjectReference>, key: ParityKey): string[] {
    const _instruction = Utils.Reaction.flatten(instruction)

    this.instructions.byParent.byParity[instruction.object.id] ??= {}
    const list = (this.instructions.byParent.byParity[instruction.object.id][key] ??= [])

    // create reverse index path to store inside reference
    const index = list.length
    const _path = `instructions.byParent.byParity.["${instruction.object.id}"].["${key}"].[${index}]`

    // inject reverse index in reference
    list.push({ reference: _instruction, _path })

    return [_path]
  }

  _index_triggers_byEvent(event: string, entry: Prioritized<ReactionTriggerReference>): string[] {
    const list = (this.triggers.byEvent[event] ??= [])

    // create reverse index path to store inside reference
    const index = list.length
    const _path = `triggers.byEvent.${event}.[${index}]`

    // inject reverse index in reference
    list.push({ ...entry, _path })

    return [_path]
  }

  _index_triggers_byObject_StringPath(property: ExplicitPropertyReference, entry: Prioritized<ReactionTriggerReference>): string[] {
    const _object = Utils.Object.flatten(property.object)
    const _stringPath = String(property.path)

    this.triggers.byObject.byStringPath[_object] ??= {}
    const list = (this.triggers.byObject.byStringPath[_object][_stringPath] ??= [])

    // create reverse index path to store inside entry
    const index = list.length
    const _path = `triggers.byObject.byStringPath.["${_object}"].["${_stringPath}"].[${index}]`

    // inject reverse index in entry
    list.push({ ...entry, _path })

    return [_path]
  }

  _index_triggers_byObject_RegexPath(property: ExplicitPropertyReference, entry: Prioritized<ReactionTriggerReference>): string[] {
    const _object = Utils.Object.flatten(property.object)
    const _stringPath = String(property.path)

    this.triggers.byObject.byRegexPath[_object] ??= {}
    this.triggers.byObject.byRegexPath[_object][_stringPath] ??= { pattern: property.path as RegExp, list: [] }
    const list = this.triggers.byObject.byRegexPath[_object][_stringPath].list

    // create reverse index path to store inside entry
    const index = list.length
    const _path = `triggers.byObject.byRegexPath.["${_object}"].["${_stringPath}"].list.[${index}]`

    // inject reverse index in entry
    list.push({ ...entry, _path })

    // TODO: On removing indexes, check if byRegexPath list is empty (if it is, remove the entire pattern from there)
    return [_path]
  }

  // #endregion

  // #region FETCHING

  /** Fetch all reaction triggers (with a attached context if necessary, which kind of makes it a parallel reaction without a trigger) that watch a specific property */
  fetch(property: StrictPropertyReference, options: Partial<FetchOptions> = {}): ParallelTrigger[] {
    // get all variant object references
    const variants = options.useVariants ? this._variants(property.object) : [Utils.Object.flatten(property.object)]

    const triggers = [] as ParallelTrigger[]
    for (const object of variants) {
      const variantTargets = this._fetch(object, property.path)

      // WARN: Never tested
      if (variants.length > 1 && variantTargets.length >= 1 && triggers.length > 0) debugger

      triggers.push(...variantTargets)
    }

    return triggers
  }

  /**
   * Fetches all reaction triggers watching object and path
   * @param object Object that was updated
   * @param path Path to property that was updated
   * @returns
   */
  _fetch(object: FlatObjectReference, path: string): ParallelTrigger[] {
    const _object = Utils.Object.unflatten(object)

    // ERROR: Object MUST be explicit
    if (Utils.Object.isImplicit(_object)) debugger

    const triggers = [] as ParallelTrigger[]

    // get all matchges for property.path through optimized indexes
    triggers.push(...this._fetch_StringString(object, path)) // string in reaction watchlist === string in property path
    triggers.push(...this._fetch_StringRegex(object, path)) // regex in reaction watchlist MATCHES string in property path

    return triggers
  }

  /** Fetch all reactions that reference property path directly (reaction watching string X property path string) */
  _fetch_StringString(object: FlatObjectReference, path: string): ParallelTrigger[] {
    const byPath: PathAware<Prioritized<ReactionTriggerReference>>[][] = []

    // WARN: Never tested
    if (path === `*`) debugger

    // if PATH itself is "any", just get ALL triggers
    if (path === `*`) {
      const byObject = this.triggers.byObject.byStringPath[object]

      for (const triggers of Object.values(byObject)) byPath.push(triggers)
    } else {
      byPath.push(this.triggers.byObject.byStringPath[object]?.[path] ?? [])

      // if there is a target watching for "any" path, inject it too
      byPath.push(this.triggers.byObject.byStringPath[object]?.[`*`] ?? [])
    }

    // inject empty context and clone reference
    return byPath.flat().map(trigger => ({
      ...cloneDeep(trigger),
      data: {
        context: {},
      },
    }))
  }

  /** Fetch all reactions that could reference property path via a regex pattern (reaction watching regex X property path string) */
  _fetch_StringRegex(object: FlatObjectReference, path: string): ParallelTrigger[] {
    // target -> regex path key -> { pattern, list of prioritized strategies }

    // WARN: Never tested
    if (path === `*`) debugger

    const byPattern = [] as ParallelTrigger[][]

    // get all patterns that target this object
    const patterns = this.triggers.byObject.byRegexPath[object] ?? {}

    // for each pattern, test property path
    for (const { pattern, list: triggers } of Object.values(patterns)) {
      // make pattern global (if necessary)
      const globalPattern = new RegExp(pattern, `g`)
      const match = [...path.matchAll(globalPattern)]
      if (match.length === 0) continue

      // ERROR: Untested multiple matching
      if (match.length > 1) debugger

      const groups = match[0].slice(1)

      // inject capturing groups into context
      const context: ReactionContext = { regex: groups }

      // push reactions to list
      const local = [] as (typeof byPattern)[number]
      for (const trigger of triggers) {
        const prioritized: ParallelTrigger = {
          ...cloneDeep(trigger),
          data: {
            context,
          },
        }

        local.push(prioritized)
      }
    }

    return byPattern.flat()
  }

  // #endregion

  // #region REACTING/HANDLING

  /** React to changes in a list of properties. Properties is a list of properties that were changed. */
  react(properties: ExplicitPropertyReference<string>[], options: Partial<FetchOptions> = {}): ParallelReaction[] {
    // react to all properties
    const prioritized = [] as ReturnType<ReactiveIndexation[`_react`]>
    for (const property of properties) {
      // get strict property reference (since _property can be a alias property reference, for example)
      const strictObject = this._strict(property.object)!

      // ERROR: Could not find strict reference to object
      if (isNil(strictObject)) debugger

      const strictProperty: StrictPropertyReference = { object: cloneDeep(strictObject), path: property.path }

      const _prioritized = this._react(strictProperty, options)

      prioritized.push(..._prioritized)
    }

    // order by priority
    const reactions = orderBy(prioritized, `priority`, `asc`).map(({ priority, ...reaction }) => reaction)

    return reactions
  }

  /** React to changes to property */
  _react(_property: StrictPropertyReference, options: Partial<FetchOptions> = {}): Prioritized<ParallelReaction>[] {
    const baseCause: Omit<PropertyUpdated, `_trigger`> = { type: `property`, property: _property }

    // get all reaction trigger (across all objects in manager) that are watching updated property
    //    this ALREADY considers object referential mapping ("object variants") and reactions looking for "any" path update in a object
    const triggers = this.fetch(_property, options)

    // parse trigger into prioritized reactions
    const prioritizedReactions: Prioritized<ParallelReaction>[] = []
    for (const { priority, data, ...triggerReference } of triggers) {
      // customize cause to reaction
      //    get original trigger from instruction (TODO: Is it necessary?)
      const instruction = this.manager.getReactionInstruction(triggerReference.instruction)
      const trigger = instruction.triggers.get()[triggerReference.index] as PropertyTrigger
      const cause: PropertyUpdated = { ...cloneDeep(baseCause), _trigger: { ...cloneDeep(trigger), _reference: cloneDeep(triggerReference) } }

      // strictify target object
      let strictTarget = this._strict(instruction.target.get(), triggerReference.instruction.object.id)!

      // strictify definition object
      let strictObject = this._strict(instruction.definition.get().object, triggerReference.instruction.object.id)!
      let strictDefinition: ReactionDefinitionReference<StrictObjectReference> = { ...cloneDeep(instruction.definition.get()), object: strictObject }

      // ERROR: Could not find strict objects
      if (!strictTarget || !strictObject) debugger

      // build context
      const context: ReactionContext = data.context
      if (instruction._context) {
        if (context.hash) debugger
        context.hash = instruction._context
      }

      data.context = context

      // build parallel reaction
      const reaction: ParallelReaction = {
        ...data,
        //
        target: strictTarget,
        definition: strictDefinition,
        //
        trace: [cause],
      }

      prioritizedReactions.push({ priority, ...reaction })
    }

    return prioritizedReactions
  }

  /** Handle a event call, returning all reactions expeting such event */
  handle(name: string): ParallelReaction[] {
    const baseCause: Omit<EventCalled, `_trigger`> = { type: `event`, name, data: {} }

    const byEvent = this.triggers.byEvent[name] ?? []

    // parse targets into prioritized reactions
    const prioritizedReactions: Prioritized<ParallelReaction>[] = []
    for (const { _path, priority, ...triggerReference } of byEvent) {
      // customize cause to reaction
      //    get original trigger from instruction (TODO: Is it necessary?)
      const instruction = this.manager.getReactionInstruction(triggerReference.instruction)
      const trigger = instruction.triggers.get()[triggerReference.index] as EventTrigger
      const cause: EventCalled = { ...cloneDeep(baseCause), _trigger: { ...cloneDeep(trigger), _reference: cloneDeep(triggerReference) } }

      // strictify target object
      let strictTarget = this._strict(instruction.target.get(), triggerReference.instruction.object.id)!

      // strictify definition object
      let strictObject = this._strict(instruction.definition.get().object, triggerReference.instruction.object.id)!
      let strictDefinition: ReactionDefinitionReference<StrictObjectReference> = { ...cloneDeep(instruction.definition.get()), object: strictObject }

      // ERROR: Could not find strict objects
      if (!strictTarget || !strictObject) debugger

      // build context
      const context: ReactionContext = {}
      if (instruction._context) context.hash = instruction._context

      // build parallel reaction
      const reaction: ParallelReaction = {
        target: strictTarget,
        definition: strictDefinition,
        //
        trace: [cause],
        context,
      }

      prioritizedReactions.push({ priority, ...reaction })
    }

    // order by priority
    const reactions = orderBy(prioritizedReactions, `priority`, `asc`).map(({ priority, ...reaction }) => reaction)

    return reactions
  }

  // #endregion
}
