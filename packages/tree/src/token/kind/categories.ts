// (Lexical category)                                                                                              | Explanation                                            | Sample token values                                |
// | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
// | [identifier](https://en.wikipedia.org/wiki/Identifier_(computer_languages) "Identifier (computer languages)") | Names assigned by the programmer.                      | `x`, `color`, `UP`                                 |
// | [keyword](https://en.wikipedia.org/wiki/Reserved_word "Reserved word")                                        | Reserved words of the language.                        | `if`, `while`, `return`                            |
// | [separator/punctuator](https://en.wikipedia.org/wiki/Delimiter "Delimiter")                                   | Punctuation characters and paired delimiters.          | `}`, `(`, `;`                                      |
// | [operator](https://en.wikipedia.org/wiki/Operator_(computer_programming) "Operator (computer programming)")   | Symbols that operate on arguments and produce results. | `+`, `<`, `=`                                      |
// | [literal](https://en.wikipedia.org/wiki/Literal_(computer_programming) "Literal (computer programming)")      | Numeric, logical, textual, and reference literals.     | `true`, `6.02e23`, `"music"`                       |
// | [comment](https://en.wikipedia.org/wiki/Comment_(computer_programming) "Comment (computer programming)")      | Line or block comments. Usually discarded.             | `/* Retrieves user data */`, `// must be negative` |
// | [whitespace](https://en.wikipedia.org/wiki/Whitespace_character "Whitespace character")                       | Groups of non-printable characters. Usually discarded. | –                                                  |

export const TOKEN_CATEGORIES = [
  `identifier`, //
  `keyword`,
  `separator`,
  `operator`,
  `literal`,
  `comment`,
  `whitespace`,
  //
  `unknown`, // for lexical analysis only
] as const

export type TokenCategory = (typeof TOKEN_CATEGORIES)[number]
