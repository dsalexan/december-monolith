import { TrueMatchResult } from "../phases/lexer/match"
import Type from "../type/base"

export interface Lexeme {
  type: Type
  match: TrueMatchResult
  //
  start: number // index of starting character for sequence of characters that matches the lexeme
  length: number // number of characters in sequence
}
