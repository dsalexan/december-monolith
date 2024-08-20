import { NodePattern } from "./pattern"

export interface BaseCommand {
  /**
   * Commands can have names to have its results referenced by other commands
   */
  name?: string
}

export interface MatchCommand extends BaseCommand {
  type: `match`
  pattern: NodePattern
}

export interface TranslateCommand extends BaseCommand {
  type: `translate`
  offset: Partial<{ x: number; y: number }>
}

export type Command = MatchCommand | TranslateCommand

/**
 *
 * ==================
 *      PATTERN
 * ==================
 *
 * 0 + X -> X
 *
 * ==================
 *      MATCHING
 * ==================
 *
 * 1. Match "+"
 *      By pattern type.name === 'addition' at node
 *
 *      MATCH()(P(type_name, 'addition'))
 *
 * 2. Match "0"
 *      By translating {x: 0, y: 1} from node
 *      Tecnically 0 could be a literal:number OR a list > literal:number (with bypassing)
 *
 *      MATCH()(P(type_name, 'literal:number', {bypass: P(type_name, 'list')}))
 *
 * 3. If (1) and (2) are matched, then perform replacement
 *
 * ==================
 *    REPLACEMENT
 * ==================
 *
 * 4. Match "X"
 *      By getting all children from (1) except (2)
 *
 *      MATCH('subtree')()
 *
 * 5. Replace node, matched at (1), with (4)
 *      Probably using tree.replaceWith(...) (to respect n-arity of parent node, which will mostly envolve wrapping (4) in a list)
 *
 */
