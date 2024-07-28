import { Instruction, Strategy, Computed, Parity, Reaction, Reference } from "@december/compile"
import * as Tree from "../../../../../packages/tree/src2"
import { get, mergeWith } from "lodash"
import type CharacterSheet from ".."
import { generateGURPSFunctions } from "./GURPSFunctions"
import { makeWorkers } from "./workers"

/** Adaptor that parses a ComputedValue into a ComputedObject capable of interpreting a tree expression */
export function computeExpression<TValue>(
  computedValue: Computed.Value.ComputedValue<TValue, typeof generateGURPSFunctions>,
  baseSymbols: Computed.Object.ScopeSymbolMap,
  meta: object,
): Computed.Object.ComputedObject<typeof generateGURPSFunctions, TValue> {
  // 0. make workers
  const { parser, interpreter } = makeWorkers(meta)

  // 1. parse expression into tree
  const tree = parser.parse(computedValue.expression)
  const node = tree.root.children[0] as Tree.SyntaxNode // ignoring root (first node) and imaginary (second node)

  // DEBUG
  // const printer = new Tree.Printer()
  // printer.horizontal(node.root)

  // 2. interpret tree
  const object = interpreter.process(node)

  // 3. create scope
  /**
   * SCOPE is composed of 3 parts
   *    - DONE (inside TreeInterpreter.scope())   core:         core scope with basic functions and variable, such as "__invoke"
   *    - gurps:        functions and varibles common to any gurps context
   *    - character:    functions and variables requested from character sheet
   */
  // FIXME: Sending empty sheet and me just to get all "default" scope keys
  const scope = interpreter.scope(generateGURPSFunctions(null as any, null as any))

  // 4. make a list of references from missing scope
  const scopeKeys = Object.keys(scope)
  const identifiers = Object.keys(object.identifiers).map(key => ({ type: `identifier`, key }))
  const functions = Object.keys(object.functions).map(key => ({ type: `function`, key }))
  const literals = Object.keys(object.literals).map(key => ({ type: `literal`, key }))

  const RELEVANT_LITERALS: string[] = []
  const literalsToKeep = literals.filter(({ key }) => RELEVANT_LITERALS.includes(key))

  const symbols: Computed.Object.ScopeSymbolMap = baseSymbols
  for (const { type, key } of [...identifiers, ...functions, ...literalsToKeep]) {
    // all keys that are not already in scope are MISSING ("unresolved")
    const isMissing = !scopeKeys.includes(key)
    if (!isMissing) continue

    const id = `${type}×${key}`

    if (type === `identifier` || type === `literal`) {
      const isTrait = /^\w{2}:/.test(key)
      // const isStrikeDice = /^(thr|sw)$/.test(key)

      //  || isStrikeDice
      if (isTrait) {
        symbols[id] ??= []
        symbols[id].push({
          id,
          key,
          trigger: {
            type: `property`,
            property: {
              object: { type: `alias`, alias: key },
              path: `*`,
            },
            policy: `always`,
          },
          value: { type: `self` },
        })
      } else {
        // ERROR: How to deal with variables that ARE NOT traits???
        debugger
      }
    } else {
      // ERROR: Unimplemented key type
      debugger

      throw new Error(`Unimplemented key type "${type}" for missing reference "${key}"`)
    }
  }

  // 5. build computed object
  const computedObject = new Computed.Object.ComputedObject<typeof generateGURPSFunctions, TValue>(computedValue, symbols, _scope => {
    const scope = generateGURPSFunctions(..._scope)

    // TODO: Type meta
    const result = interpreter.interpret(object, interpreter.scope(scope), { validateScope: true, fillScope: true, strict: false, mode: get(meta, `mode`, `text`) })

    return result
  })

  return computedObject
}

function _merge(A: object, B: object) {
  const merged = {}
  mergeWith(merged, A, B, (srcValue, newValue, key, source, object) => {
    if (srcValue === undefined && newValue !== undefined) return newValue
    else if (srcValue !== undefined && newValue === undefined) return srcValue
    else if (srcValue === newValue) return srcValue

    // source === listMigration
    // object === migration
    debugger
    // if (isOrigin(migration._meta.origin, [`gcs`])) return newValue
    // else if (isOrigin(lastMigration._meta.origin, [`gcs`])) return srcValue

    // ERROR: Mergin not implemented
    debugger
  })

  return merged
}
