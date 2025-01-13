export type BaseValueType = `expression` | `gurps-dice-notation` | `tag-name` | `numeric` | `string` | `numeric-expression` | `any` | `codes-directive` | `unknown` | `string-list` | `no-mult-directive`
export type ValueType = BaseValueType | RepeatingArgument

export interface RepeatingArgument {
  repeatingArgument: true
  values: BaseValueType[]
}

export interface BaseFunctionDefinition {
  type: string
  return: ValueType
}

export interface RegularFunctionDefinition extends BaseFunctionDefinition {
  type: `regular`
  arguments: ValueType[]
}

export type FunctionDefinition = RegularFunctionDefinition

export const R = (...args: BaseValueType[]): RepeatingArgument => ({ repeatingArgument: true, values: args })

export const DEFINITION = (args: ValueType[], returnType: ValueType): FunctionDefinition => ({ type: `regular`, arguments: args, return: returnType })

export const SPREAD_DEFINITION = (args: ValueType[], returnType: ValueType): FunctionDefinition => ({ type: `regular`, arguments: args, return: returnType })

export const MATH_FUNCTIONS = {
  "@BaseSWDice": DEFINITION([`expression`], `gurps-dice-notation`),
  "@BaseTHDice": DEFINITION([`expression`], `gurps-dice-notation`),
  "@BonusAdds": DEFINITION([`tag-name`], `gurps-dice-notation`),
  "@BonusMults": DEFINITION([`tag-name`], `numeric`),
  "@Ceiling": DEFINITION([`numeric`], `numeric`),
  // @Ceil
  "@EndsWith": DEFINITION([`string`, `string`], `numeric`), // case insensitive
  "@Fac": DEFINITION([`numeric-expression`], `numeric`),
  // @Factorial
  "@Fix": DEFINITION([`numeric-expression`], `numeric`), // returns the integer portion of a number
  //    The difference between @FIX and @INT is in negative numbers: @INT returns the first negative integer
  //    less than or equal to VALUE, while @FIX returns the first negative integer greater than or equal to VALUE.
  "@Floor": DEFINITION([`numeric`], `numeric`),
  "@HasMod": DEFINITION([`string`], `numeric`),
  "@HasModIncludesText": DEFINITION([`string`], `numeric`),
  "@HasModIncludesTextMin": DEFINITION([`string`, `numeric`], `numeric`),
  "@HasModWithTag": DEFINITION([`tag-name`, `any`], `numeric`),
  "@HasModWithTagMin": DEFINITION([`tag-name`, `string`], `numeric`),
  "@HasModWithTagValue": DEFINITION([`tag-name`, `numeric`], `numeric`),
  "@HasModWithTagValueMin": DEFINITION([`tag-name`, `numeric`], `numeric`),
  // "@If": DEFINITION([R(`expression`, `expression`), `expression`], `expression`),
  // "@IndexedValue": DEFINITION([`numeric-expression`, R(`string`)], `string`), // index 1-based, if it evaluates to 0 returns an empty string
  "@Int": DEFINITION([`numeric-expression`], `numeric`),
  "@IsEven": DEFINITION([`numeric`], `numeric`),
  "@ItemHasMod": DEFINITION([`string`, `string`], `numeric`),
  "@ItemsInLibraryGroup": DEFINITION([`string`], `numeric`),
  // "@ItemsInList": DEFINITION([`codes-directive`, R(`string`)], `numeric`),
  "@Len": DEFINITION([`string`], `numeric`),
  "@Log": DEFINITION([`numeric-expression`], `numeric`), // log10
  // "@Max": DEFINITION([R(`numeric-expression`)], `numeric`),
  // "@Min": DEFINITION([R(`numeric-expression`)], `numeric`),
  "@Modulo": DEFINITION([`numeric-expression`, `numeric-expression`], `numeric`),
  "@NLog": DEFINITION([`numeric-expression`], `numeric`), // natural log
  // @LogN
  "@OwnerHasMod": DEFINITION([`string`], `numeric`),
  "@Power": DEFINITION([`numeric-expression`, `numeric-expression`], `numeric`), // evaluates to 1 if return is not an integer
  "@Round": DEFINITION([`numeric-expression`, `numeric-expression`], `numeric`),
  "@SameText": DEFINITION([`string`, `string`], `numeric`), // case insensitive
  "@Sqr": DEFINITION([`numeric-expression`], `numeric`),
  "@StartsWith": DEFINITION([`string`, `string`], `numeric`), // case insensitive
  // "@SumList": DEFINITION([R(`numeric-expression`)], `numeric`),
  // "@TextIndexedValue": DEFINITION([`string`, R(`string`, `expression`), `expression`], `expression`),
  // "@TextIsInList": DEFINITION([`string`, `string-list`], `numeric`),
  // "@TextIsInListAlt": DEFINITION([`string`, `string`, `string-list`], `numeric`),
  "@TextIsInText": DEFINITION([`string`, `string`], `numeric`),
  // "@TotalChildrenTag": DEFINITION([`tag-name`, `no-mult-directive`], `numeric`),
  // "@TotalOwnerChildrenTag": DEFINITION([`tag-name`, `no-mult-directive`], `numeric`),
}

export const MATH_FUNCTIONS_INDEX = {
  ...MATH_FUNCTIONS,
  "@Ceil": MATH_FUNCTIONS[`@Ceiling`],
  "@Factorial": MATH_FUNCTIONS[`@Fac`],
  "@LogN": MATH_FUNCTIONS[`@NLog`],
  // ...Object.fromEntries(Object.entries(MATH_FUNCTIONS).map(([key, value]) => [key.toLowerCase(), value])),
}

export const TEXT_FUNCTIONS = {
  $BonusStrings: DEFINITION([`tag-name`], `string`),
  $Eval: DEFINITION([`expression`], `string`),
  $If: DEFINITION([R(`expression`, `expression`), `expression`], `expression`),
  $IndexedValue: DEFINITION([`numeric-expression`, R(`string`)], `string`),
  $InsertInto: DEFINITION([`string`, `string`, `numeric`], `string`),
  $ListNoBlanks: DEFINITION([`codes-directive`, R(`string`)], `string`),
  $Modifiers: DEFINITION([`string`, `string`, `string`], `string`), // only useful at DISPLAYNAMEFORMULA
  $TextIndexedValue: DEFINITION([`string`, R(`string`, `expression`), `expression`], `expression`),
}

export const GENERIC_ROLL_FUNCTIONS = {
  "@Random": DEFINITION([`numeric`, `numeric`], `numeric`),
  "@Roll": DEFINITION([`numeric`, `numeric`], `numeric`),
  "@RollValues": DEFINITION([`numeric`, `numeric`], `numeric`),
}

export const GENERIC_STORED_RESULT_FUNCTION = {
  "@LastRoll": DEFINITION([], `numeric`),
  "@LastRandom": DEFINITION([], `numeric`),
  $LastRollValues: DEFINITION([], `string`),
}

// These functions each work the same as their unnamed counterparts. The only difference is that you can name the roll
// by specifying the name as the first parameter. By using these functions and specifying unique names, you can retrieve
// them later by name and be less concerned that another use of the unnamed functions will overwrite the values.
export const NAMED_ROLL_FUNCTIONS = {
  "@NamedRandom": DEFINITION([`string`, `numeric`, `numeric`], `numeric`),
  "@NamedRoll": DEFINITION([`string`, `numeric`, `numeric`], `numeric`),
  $NamedRollValues: DEFINITION([`string`, `numeric`, `numeric`], `string`),
}

// These functions allow you retrieve the named results that were stored by using one of the named roll functions.
// In this way, you can roll using a named function, and use that value both where it was rolled and elsewhere later.
export const NAMED_STORED_RESULT_FUNCTIONS = {
  "@LastNamedRoll": DEFINITION([`string`], `numeric`),
  "@LastNamedRandom": DEFINITION([`string`], `numeric`),
  $LastNamedRollValues: DEFINITION([`string`], `string`),
}
