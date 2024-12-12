import { Instruction, Strategy, Computed, Parity, Reaction, Reference } from "@december/compile"
import * as Tree from "../../../../../packages/tree/src"
import { get, mergeWith } from "lodash"
import type CharacterSheet from ".."
import { generateGURPSFunctions } from "./GURPSFunctions"

// const ALL_DEFAULT_SYNTAXES = [...Tree.DEFAULT_SYNTAXES, Tree.Pattern.IF, Tree.Pattern.FUNCTION, ...Tree.Separator.LOGICAL_SYNTAX_NAMES, Tree.Separator.INVOKER, ...Tree.Separator.MATH_SYNTAX_NAMES]
const TEXT_DEFAULT_SYNTAXES = [...Tree.DEFAULT_SYNTAXES, Tree.Pattern.IF, Tree.Pattern.FUNCTION, Tree.Pattern.EVAL, Tree.Pattern.INVOKER, ...Tree.Separator.LOGICAL_SYNTAX_NAMES]
const MATH_DEFAULT_SYTNAXES = [...TEXT_DEFAULT_SYNTAXES, ...Tree.MATH_SYNTAXES]

/** Instantiate all workers responsible to parse a string into a final value (syntax manager, tree parser, tree interpreter) */
export function makeWorkers({ mode }: { mode?: `math` | `text` } = {}) {
  //syntaxes: ConstructorParameters<typeof Tree.SyntaxManager>[0] | null = null
  const _syntaxes = mode === `math` ? MATH_DEFAULT_SYTNAXES : TEXT_DEFAULT_SYNTAXES

  const manager = new Tree.SyntaxManager(_syntaxes)
  const parser = new Tree.Parser(manager)
  const interpreter = new Tree.Interpreter.TreeInterpreter()

  return {
    manager,
    parser,
    interpreter,
  }
}

interface InterpreterContext<TMe = unknown> {
  sheet: CharacterSheet
  me: TMe // a.k.a. "containing item"
}
