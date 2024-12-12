import { get, has, isNil, max, maxBy } from "lodash"
// import { Dice } from "../../dice"
import CharacterSheet from ".."
import { makeWorkers } from "./workers"
import { Interpreter } from "../../../../../packages/tree/src"
import { Dice } from "../../dice/index"

export interface BaseInterpreterContext<TMe = unknown> {
  sheet: CharacterSheet
  me: TMe // a.k.a. "containing item"
}

export interface IInterpreterContext<TMe = unknown> extends BaseInterpreterContext<TMe> {
  // CORE

  // MATH
  // #region MathFunctions
  [`@basethdice`]: (this: IInterpreterContext<TMe>, value: number | { score: number }) => Dice
  [`@itemhasmod`]: (this: IInterpreterContext<TMe>, traitName: { name: string; nameext?: string } | null, modName: string) => number
  [`@max`]: (this: IInterpreterContext<TMe>, ...valueList: (number | Dice)[]) => number | Dice
  // #endregion

  // #region SpecialCaseSubstitutions
  [`%level`]: (this: IInterpreterContext<TMe>) => number
  [`%count`]: (this: IInterpreterContext<TMe>) => number
  [`$textvalue`]: (this: IInterpreterContext<TMe>, keywordTag: string) => unknown
  [`$val`]: (this: IInterpreterContext<TMe>, keywordTag: string) => ReturnType<(typeof Math.SpecialCaseSubstitutions)[`$textvalue`]>
  // #endregion

  // TEXT PROCESSING
  // #region TextFunctions
  [`$bonusstrings`]: (this: IInterpreterContext<TMe>, tagName: string) => string
  [`$eval`]: (this: IInterpreterContext<TMe>, expression: string) => string
  [`$evaluate`]: (this: IInterpreterContext<TMe>, expression: string) => string
  [`$solver`]: (this: IInterpreterContext<TMe>, expression: string) => string
  // #endregion
}

export const generateGURPSFunctions = <TMe>(sheet: CharacterSheet, me: TMe, scope: object = {}): IInterpreterContext<TMe> => {
  if (sheet) {
    // debugger
  }

  return {
    ...scope,
    sheet,
    me,
    //
    ...Core,
    ...Math.MathFunctions,
    ...Math.SpecialCaseSubstitutions,
    ...TextProcessing.TextFunctions,
  }
}

export const Core = {}

export const Math = {
  MathFunctions: {
    "@basethdice": function (this: IInterpreterContext, value: number | { score: number }): Dice {
      // This function takes a value and returns the base Thrust damage dice that would result if the value was a ST score.
      const damageTable = this.sheet.character.data.damageTable

      const score = typeof value === `number` ? value : value.score

      if (isNil(score) || isNaN(score)) debugger

      const d = damageTable[score].thr
      if (!d) debugger

      return d.clone()
    },
    "@itemhasmod": function (this: IInterpreterContext, traitName: { name: string; nameext?: string } | null, modName: string): number {
      // This function is used to determine if the specified trait has a certain modifier applied to it.

      // If the specified trait is found on the character, and the specified modifier is applied to that trait, then this function returns the level of the modifier. Otherwise, this function returns 0.
      // This function will look for modifiers that have name extensions using either the old NAME (NAMEEXT) format, or the newer NAME, NAME EXT format that modifiers display in the UI now.

      const nameext = traitName?.nameext ?? ``

      return nameext === modName ? 1 : 0
    },
    "@max": function (this: IInterpreterContext, ...valueList: (number | Dice)[]): number | Dice {
      //       This function returns the maximum value from a list of values.

      // @MIN(VALUELIST)

      // VALUELIST is the list of values that are to be evaluated, separated by commas. Each value  may be an expression.

      // The VALUELIST can be as long as required.

      const allAreTheSameType = valueList.every(value => typeof value === `number` || value instanceof Dice)

      const dices = valueList.filter(value => value instanceof Dice) as Dice[]
      const allDiceHaveTheSameSides = dices.every(dice => dice.sides === dices[0].sides)

      // TODO: Implement those cases
      if (!allAreTheSameType) debugger
      if (!allDiceHaveTheSameSides) debugger

      return maxBy(valueList, value => {
        if (typeof value === `number`) return value
        if (Dice.isDice(value)) return value.average(true)

        // ERROR: Unimplemented value type
        debugger
        return -Infinity
      })!
    },
  },
  SpecialCaseSubstitutions: {
    "%level": function (this: IInterpreterContext): number {
      // This variable will be replaced by the level of the containing item.
      // i.e. me::level

      // ERROR: Me lacks level
      if (!has(this.me, `level`)) debugger

      const level: any = get(this.me, `level`)

      // ERROR: Me's level is not a number
      if (isNaN(level) || typeof level !== `number`) debugger

      return level as number
    },
    "%count": function (this: IInterpreterContext): number {
      // This variable will be replaced by the value of the COUNT() tag of the containing item.
      debugger
      return 1
    },
    $textvalue: function (this: IInterpreterContext, keywordTag: string): string {
      // This variable functions very much like a text function. This is a means of inserting a bit of text, based on a trait value, into an expression before it is evaluated.

      // $TEXTVALUE(KEYWORD[::TAG] )
      /**
       * Where:
          KEYWORD is a trait name, or one of a variety of keywords:
            CHAR references the character.
            OWNER references the trait or modifier that owns the containing item.
            ME references the containing item.
            DEFAULT references the trait being defaulted from.
            PREREQ returns a list of values for the traits in the pre-requisite list.
            LOWPREREQ returns a list of values for the traits in the pre-requisite list.
          TAG is a tag reference, if needed.
      
            If TAG is used, a tag value may be obtained from a trait, from the character, from the owning item, or from the containing item itself.
      */

      debugger

      return `???`
    },
    $val: function (this: IInterpreterContext, keywordTag: string): string {
      // This is identical in function to $TEXTVALUE(), just shorter
      return this.$textvalue.call(this, keywordTag)
    },
  },
}

export const TextProcessing = {
  TextFunctions: {
    $bonusstrings: function (this: IInterpreterContext, tagName: string): string {
      // Returns the concatenated string of all text bonuses targeted to the given tag of the calculating trait, or an empty string if there are none.
      debugger
      return `` // TODO Implement GURPS function
    },
    $eval: function (this: IInterpreterContext, expression: string): string {
      // This function simply allows for processing a math expression within the text solver.

      // EXPRESSION is the expression sent to the math solver.
      // You may use $EVALUATE or $SOLVER as synonyms for $EVAL.

      const workers = makeWorkers({ mode: `math` }) // instantiate workers TODO: Optim this somehow
      debugger

      return ``
    },
    $evaluate: function (this: IInterpreterContext, expression: string): string {
      return this.$eval.call(this, expression)
    },
    $solver: function (this: IInterpreterContext, expression: string): string {
      return this.$eval.call(this, expression)
    },
  },
}
