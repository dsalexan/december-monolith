// BASE_POINTS = LEVEL_COST(BASE_LEVEL)
export interface LevelCost {
  type: `level`
  display: string // Cost()*
  //
  expression: string // Cost(), Formula(), ForceFormula()
  //      sometimes Formula() doesnt exists, the cost is just the numerical/progression value in Cost()
  //      anyway, in importing we always get the "better" of Cost() or Formula() to determina the expression (which is the responsible for compiling the final cost value)
  //      in cases where Formula() exists, Cost() will end up as the "display" for cost
  //
  //      ForceFormula() forces Formula() instead of Cost()
  //      Without this (for modifiers), Cost() is used for PROGRESSIONS, and FORMULA() for everything else
  //
  // points: number // points — final cost in points for trait, ALWAYS calculated from expression(level) {DONT SET IT HERE, SET AT "ROOT" OF TRAIT FOR ACCESSIBILITY}
}

// a generic "ProgressionCost", but it is only used by skills, spells and techniques
// BOUGHT_LEVEL = PROGRESSION_COST(BASE_POINTS)
export interface ProgressionCost {
  type: `progression`
  display: string // display for cost, usuarry the same as Type() (Tech/H or DX/E)
  //
  progression: string // derived from Type() (i.e. Tech/H or DX/E)
  modifier: number // derived from Type(), based on DIFFICULTY
  default: number // derived from Type(), based on DIFFICULTY and only applicable when POINTS = 0 (since the final level is calculated from invested points)
  //
  // level: number // level — final level for invested points {DONT SET IT HERE, SET AT "ROOT" OF TRAIT FOR ACCESSIBILITY}
}

// const SKILL_BOUGHT_LEVEL = (points: number) => {
//   if (points === 0) -4 - difficultyModifier + +(difficulty === `VH`)
//   return getProgressionIndex(`1/2/4/8`, points) - difficultyModifier
// }

// const TECHNIQUE_BOUGHT_LEVEL = (points: number) => {
//   if (points === 0) return 0
//   return getProgressionIndex(techniqueProgression, points) + 1
// }

// applicable for attributes, score is calculated from points invested
// BOUGHT_SCORE = INITIAL_SCORE + STEP_COST(BASE_POINTS)
export interface StepCost {
  type: `step`
  display: string // display for cost, usually something like "20pts/level" or sumthn
  //
  //                  Up()                   UpFormula()
  increment: { progression: string } | { expression: string; value: number }
  //                 Down()                 DownFormula()
  decrement: { progression: string } | { expression: string; value: number }
  step: number // Step()
  //
  // score: number // score — final score for invested points + initial score {DONT SET IT HERE, SET AT "ROOT" OF TRAIT FOR ACCESSIBILITY}
}

// cost for monetary stuff, DOLLAR_COST = BASE * COUNT
export interface MonetaryCost {
  type: `monetary`
  display: string // display for cost
  //
  unitaryExpression?: string | number // BaseCostFormula()
  unitary: number // BaseCost() — can be a INPUT or calculated by unitaryExpression
  //
  expression?: string // Formula(), CostFormula()
  value: number // cost — final cost in GURPS MONEY ($), base cost * count OR calculated by expression
}

export type TraitCost = LevelCost | ProgressionCost | StepCost | MonetaryCost
