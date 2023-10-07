/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, MathNode, OperatorNode, ParenthesisNode } from "mathjs"

export type CorrectMathNode = MathNode & {
  getIdentifier(): string
  getContent(): CorrectMathNode
  content: CorrectMathNode
  implicit: boolean
  args: CorrectMathNode[]
}

export type ParenthesisOption = `keep` | `auto` | `all`
export type ImplicitOption = `hide` | `show`

export const properties = [
  {
    // assignment
    AssignmentNode: {},
    FunctionAssignmentNode: {},
  },
  {
    // conditional expression
    ConditionalNode: {
      latexLeftParens: false,
      latexRightParens: false,
      latexParens: false,
      // conditionals don't need parentheses in LaTeX because
      // they are 2 dimensional
    },
  },
  {
    // logical or
    "OperatorNode:or": {
      op: `or`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // logical xor
    "OperatorNode:xor": {
      op: `xor`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // logical and
    "OperatorNode:and": {
      op: `and`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // bitwise or
    "OperatorNode:bitOr": {
      op: `|`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // bitwise xor
    "OperatorNode:bitXor": {
      op: `^|`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // bitwise and
    "OperatorNode:bitAnd": {
      op: `&`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // relational operators
    "OperatorNode:equal": {
      op: `==`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:unequal": {
      op: `!=`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:smaller": {
      op: `<`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:larger": {
      op: `>`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:smallerEq": {
      op: `<=`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:largerEq": {
      op: `>=`,
      associativity: `left`,
      associativeWith: [],
    },
    RelationalNode: {
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // bitshift operators
    "OperatorNode:leftShift": {
      op: `<<`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:rightArithShift": {
      op: `>>`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:rightLogShift": {
      op: `>>>`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // unit conversion
    "OperatorNode:to": {
      op: `to`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // range
    RangeNode: {},
  },
  {
    // addition, subtraction
    "OperatorNode:add": {
      op: `+`,
      associativity: `left`,
      associativeWith: [`OperatorNode:add`, `OperatorNode:subtract`],
    },
    "OperatorNode:subtract": {
      op: `-`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // multiply, divide, modulus
    "OperatorNode:multiply": {
      op: `*`,
      associativity: `left`,
      associativeWith: [`OperatorNode:multiply`, `OperatorNode:divide`, `Operator:dotMultiply`, `Operator:dotDivide`],
    },
    "OperatorNode:divide": {
      op: `/`,
      associativity: `left`,
      associativeWith: [],
      latexLeftParens: false,
      latexRightParens: false,
      latexParens: false,
      // fractions don't require parentheses because
      // they're 2 dimensional, so parens aren't needed
      // in LaTeX
    },

    "OperatorNode:dotMultiply": {
      op: `.*`,
      associativity: `left`,
      associativeWith: [`OperatorNode:multiply`, `OperatorNode:divide`, `OperatorNode:dotMultiply`, `OperatorNode:doDivide`],
    },
    "OperatorNode:dotDivide": {
      op: `./`,
      associativity: `left`,
      associativeWith: [],
    },
    "OperatorNode:mod": {
      op: `mod`,
      associativity: `left`,
      associativeWith: [],
    },
  },
  {
    // Repeat multiplication for implicit multiplication
    "OperatorNode:multiply": {
      associativity: `left`,
      associativeWith: [`OperatorNode:multiply`, `OperatorNode:divide`, `Operator:dotMultiply`, `Operator:dotDivide`],
    },
  },
  {
    // unary prefix operators
    "OperatorNode:unaryPlus": {
      op: `+`,
      associativity: `right`,
    },
    "OperatorNode:unaryMinus": {
      op: `-`,
      associativity: `right`,
    },
    "OperatorNode:bitNot": {
      op: `~`,
      associativity: `right`,
    },
    "OperatorNode:not": {
      op: `not`,
      associativity: `right`,
    },
  },
  {
    // exponentiation
    "OperatorNode:pow": {
      op: `^`,
      associativity: `right`,
      associativeWith: [],
      latexRightParens: false,
      // the exponent doesn't need parentheses in
      // LaTeX because it's 2 dimensional
      // (it's on top)
    },

    "OperatorNode:dotPow": {
      op: `.^`,
      associativity: `right`,
      associativeWith: [],
    },
  },
  {
    // factorial
    "OperatorNode:factorial": {
      op: `!`,
      associativity: `left`,
    },
  },
  {
    // matrix transpose
    "OperatorNode:ctranspose": {
      op: `'`,
      associativity: `left`,
    },
  },
]

/**
 * A safe hasOwnProperty
 */
export function hasOwnProperty(object: object, property: string) {
  return object && Object.hasOwnProperty.call(object, property)
}

/**
 * Returns true if the expression starts with a constant, under the current parenthesization
 */
function startsWithConstant(expr: MathNode | CorrectMathNode, parenthesis: ParenthesisOption) {
  let curNode = expr as MathNode
  if (parenthesis === `auto`) {
    while (isParenthesisNode(curNode)) {
      curNode = curNode.content
    }
  }
  if (isConstantNode(curNode)) return true
  if (isOperatorNode(curNode)) {
    return startsWithConstant((curNode as OperatorNode).args[0], parenthesis)
  }
  return false
}

/**
 * Returns the first non-parenthesis internal node, but only
 * when the 'parenthesis' option is unset or auto.
 */
function unwrapParen(_node: CorrectMathNode | MathNode, parenthesis?: ParenthesisOption) {
  if (!parenthesis || parenthesis !== `auto`) return _node
  let node = _node as CorrectMathNode
  while (isParenthesisNode(node)) {
    node = node.content
  }
  return node
}

/**
 * Get the precedence of a Node.
 * Higher number for higher precedence, starting with 0.
 * Returns null if the precedence is undefined.
 */
export function getPrecedence(_node: CorrectMathNode | MathNode, parenthesis: ParenthesisOption, implicit?: ImplicitOption, parent?: CorrectMathNode) {
  let node = _node as CorrectMathNode
  if (parenthesis !== `keep`) {
    // ParenthesisNodes are only ignored when not in 'keep' mode
    node = (_node as CorrectMathNode).getContent()
  }

  let identifier = node.getIdentifier()
  let precedence = null as number | null
  for (let i = 0; i < properties.length; i++) {
    if (identifier in properties[i]) {
      precedence = i
      break
    }
  }

  // Bump up precedence of implicit multiplication, except when preceded
  // by a "Rule 2" fraction ( [unaryOp]constant / constant )
  if (identifier === `OperatorNode:multiply` && node.implicit && implicit !== `show`) {
    const operatorNode = node as MathNode as OperatorNode

    let leftArg = unwrapParen(operatorNode.args[0], parenthesis) as CorrectMathNode
    if (
      !(
        isConstantNode(leftArg) &&
        parent &&
        parent.getIdentifier() === `OperatorNode:divide` &&
        rule2Node(unwrapParen((parent as MathNode as OperatorNode).args[0], parenthesis))
      ) &&
      !(
        leftArg.getIdentifier() === `OperatorNode:divide` &&
        rule2Node(unwrapParen((leftArg as MathNode as OperatorNode).args[0], parenthesis)) &&
        isConstantNode(unwrapParen((leftArg as MathNode as OperatorNode).args[1]))
      )
    ) {
      // ERROR: Cannot b
      if (precedence === null) debugger
      else precedence += 1
    }
  }

  return precedence
}

/**
 * Get the associativity of an operator (left or right).
 * Returns a string containing 'left' or 'right' or null if the associativity is not defined.
 */
export function getAssociativity(_node: MathNode | CorrectMathNode, parenthesis: ParenthesisOption) {
  let node = _node as CorrectMathNode
  if (parenthesis !== `keep`) {
    // ParenthesisNodes are only ignored when not in 'keep' mode
    node = (_node as CorrectMathNode).getContent()
  }

  let identifier = node.getIdentifier()
  let index = getPrecedence(node, parenthesis)

  if (index === null) {
    // node isn't in the list
    return null
  }

  // @ts-ignore
  let property = properties[index]?.[identifier]

  if (hasOwnProperty(property, `associativity`)) {
    if (property.associativity === `left`) {
      return `left`
    }
    if (property.associativity === `right`) {
      return `right`
    }
    // associativity is invalid
    throw Error(`'` + identifier + `' has the invalid associativity '` + property.associativity + `'.`)
  }

  // associativity is undefined
  return null
}

/**
 * Check if an operator is associative with another operator.
 * Returns either true or false or null if not defined.
 */
export function isAssociativeWith(nodeA: CorrectMathNode, nodeB: CorrectMathNode, parenthesis: ParenthesisOption) {
  // ParenthesisNodes are only ignored when not in 'keep' mode
  let a = parenthesis !== `keep` ? nodeA.getContent() : nodeA
  let b = parenthesis !== `keep` ? nodeA.getContent() : nodeB
  let identifierA = a.getIdentifier()
  let identifierB = b.getIdentifier()
  let index = getPrecedence(a, parenthesis)
  if (index === null) {
    // node isn't in the list
    return null
  }

  // @ts-ignore
  let property = properties[index][identifierA]
  if (hasOwnProperty(property, `associativeWith`) && property.associativeWith instanceof Array) {
    for (let i = 0; i < property.associativeWith.length; i++) {
      if (property.associativeWith[i] === identifierB) {
        return true
      }
    }
    return false
  }

  // associativeWith is not defined
  return null
}

/**
 * Calculate which parentheses are necessary. Gets an OperatorNode
 * (which is the root of the tree) and an Array of Nodes
 * (this.args) and returns an array where 'true' means that an argument
 * has to be enclosed in parentheses whereas 'false' means the opposite.
 */
export function calculateNecessaryParentheses(_root: MathNode, parenthesis: ParenthesisOption, implicit: ImplicitOption, __args: MathNode[], latex: boolean = false) {
  const root = _root as CorrectMathNode
  const args = __args as CorrectMathNode[]

  // precedence of the root OperatorNode
  let precedence = getPrecedence(root, parenthesis, implicit)
  let associativity = getAssociativity(root, parenthesis)
  if (parenthesis === `all` || (args.length > 2 && root.getIdentifier() !== `OperatorNode:add` && root.getIdentifier() !== `OperatorNode:multiply`)) {
    return args.map(function (arg) {
      switch (arg.getContent().type) {
        // Nodes that don't need extra parentheses
        case `ArrayNode`:
        case `ConstantNode`:
        case `SymbolNode`:
        case `ParenthesisNode`:
          return false
        default:
          return true
      }
    })
  }

  let result = [] as boolean[]
  switch (args.length) {
    case 0:
      result = []
      break
    case 1:
      // unary operators
      {
        // precedence of the operand
        let operandPrecedence = getPrecedence(args[0], parenthesis, implicit, root)

        // handle special cases for LaTeX, where some of the parentheses aren't needed
        if (latex && operandPrecedence !== null) {
          let operandIdentifier
          let rootIdentifier
          if (parenthesis === `keep`) {
            operandIdentifier = args[0].getIdentifier()
            rootIdentifier = root.getIdentifier()
          } else {
            // Ignore Parenthesis Nodes when not in 'keep' mode
            operandIdentifier = args[0].getContent().getIdentifier()
            rootIdentifier = root.getContent().getIdentifier()
          }

          // @ts-ignore
          if (properties[precedence][rootIdentifier].latexLeftParens === false) {
            result = [false]
            break
          }

          // @ts-ignore
          if (properties[operandPrecedence][operandIdentifier].latexParens === false) {
            result = [false]
            break
          }
        }
        if (operandPrecedence === null) {
          // if the operand has no defined precedence, no parens are needed
          result = [false]
          break
        }

        // @ts-ignore
        if (operandPrecedence <= precedence) {
          // if the operands precedence is lower, parens are needed
          result = [true]
          break
        }

        // otherwise, no parens needed
        result = [false]
      }
      break
    case 2:
      // binary operators
      {
        let lhsParens // left hand side needs parenthesis?
        // precedence of the left hand side
        let lhsPrecedence = getPrecedence(args[0], parenthesis, implicit, root)
        // is the root node associative with the left hand side
        let assocWithLhs = isAssociativeWith(root, args[0], parenthesis)
        if (lhsPrecedence === null) {
          // if the left hand side has no defined precedence, no parens are needed
          // FunctionNode for example
          lhsParens = false
        } else if (lhsPrecedence === precedence && associativity === `right` && !assocWithLhs) {
          // In case of equal precedence, if the root node is left associative
          // parens are **never** necessary for the left hand side.
          // If it is right associative however, parens are necessary
          // if the root node isn't associative with the left hand side
          lhsParens = true
          // @ts-ignore
        } else if (lhsPrecedence < precedence) {
          lhsParens = true
        } else {
          lhsParens = false
        }
        let rhsParens // right hand side needs parenthesis?
        // precedence of the right hand side
        let rhsPrecedence = getPrecedence(args[1], parenthesis, implicit, root)
        // is the root node associative with the right hand side?
        let assocWithRhs = isAssociativeWith(root, args[1], parenthesis)
        if (rhsPrecedence === null) {
          // if the right hand side has no defined precedence, no parens are needed
          // FunctionNode for example
          rhsParens = false
        } else if (rhsPrecedence === precedence && associativity === `left` && !assocWithRhs) {
          // In case of equal precedence, if the root node is right associative
          // parens are **never** necessary for the right hand side.
          // If it is left associative however, parens are necessary
          // if the root node isn't associative with the right hand side
          rhsParens = true
          // @ts-ignore
        } else if (rhsPrecedence < precedence) {
          rhsParens = true
        } else {
          rhsParens = false
        }

        // handle special cases for LaTeX, where some of the parentheses aren't needed
        if (latex) {
          let _rootIdentifier
          let lhsIdentifier
          let rhsIdentifier
          if (parenthesis === `keep`) {
            _rootIdentifier = root.getIdentifier()
            lhsIdentifier = root.args[0].getIdentifier()
            rhsIdentifier = root.args[1].getIdentifier()
          } else {
            // Ignore ParenthesisNodes when not in 'keep' mode
            _rootIdentifier = root.getContent().getIdentifier()
            lhsIdentifier = root.args[0].getContent().getIdentifier()
            rhsIdentifier = root.args[1].getContent().getIdentifier()
          }
          if (lhsPrecedence !== null) {
            // @ts-ignore
            if (properties[precedence][_rootIdentifier].latexLeftParens === false) {
              lhsParens = false
            }

            // @ts-ignore
            if (properties[lhsPrecedence][lhsIdentifier].latexParens === false) {
              lhsParens = false
            }
          }
          if (rhsPrecedence !== null) {
            // @ts-ignore
            if (properties[precedence][_rootIdentifier].latexRightParens === false) {
              rhsParens = false
            }

            // @ts-ignore
            if (properties[rhsPrecedence][rhsIdentifier].latexParens === false) {
              rhsParens = false
            }
          }
        }
        result = [lhsParens, rhsParens]
      }
      break
    default:
      if (root.getIdentifier() === `OperatorNode:add` || root.getIdentifier() === `OperatorNode:multiply`) {
        result = args.map(function (arg) {
          let argPrecedence = getPrecedence(arg, parenthesis, implicit, root)
          let assocWithArg = isAssociativeWith(root, arg, parenthesis)
          let argAssociativity = getAssociativity(arg, parenthesis)
          if (argPrecedence === null) {
            // if the argument has no defined precedence, no parens are needed
            return false
          } else if (precedence === argPrecedence && associativity === argAssociativity && !assocWithArg) {
            return true
            // @ts-ignore
          } else if (argPrecedence < precedence) {
            return true
          }
          return false
        })
      }
      break
  }

  // Handles an edge case of parentheses with implicit multiplication
  // of ConstantNode.
  // In that case, parenthesize ConstantNodes that follow an unparenthesized
  // expression, even though they normally wouldn't be printed.
  if (args.length >= 2 && root.getIdentifier() === `OperatorNode:multiply` && root.implicit && implicit === `hide`) {
    // parenthesis !== `all` because that case is already handled above
    for (let i = 1; i < result.length; ++i) {
      if (startsWithConstant(args[i], parenthesis) && !result[i - 1] && (parenthesis !== `keep` || !isParenthesisNode(args[i - 1]))) {
        result[i] = true
      }
    }
  }
  return result
}

// #region is.js

// export function isNumber(x: any): x is number {
//   return typeof x === `number`
// }
// export function isBigNumber(x: any): x is BigNumber {
//   if (!x || typeof x !== `object` || typeof x.constructor !== `function`) {
//     return false
//   }
//   if (x.isBigNumber === true && typeof x.constructor.prototype === `object` && x.constructor.prototype.isBigNumber === true) {
//     return true
//   }
//   if (typeof x.constructor.isDecimal === `function` && x.constructor.isDecimal(x) === true) {
//     return true
//   }
//   return false
// }
// export function isComplex(x: any) {
//   return (x && typeof x === `object` && Object.getPrototypeOf(x).isComplex === true) || false
// }
// export function isFraction(x: any) {
//   return (x && typeof x === `object` && Object.getPrototypeOf(x).isFraction === true) || false
// }
// export function isUnit(x: any) {
//   return (x && x.constructor.prototype.isUnit === true) || false
// }
// export function isString(x: any) {
//   return typeof x === `string`
// }
// export var isArray = Array.isArray
// export function isMatrix(x: any) {
//   return (x && x.constructor.prototype.isMatrix === true) || false
// }

// /**
//  * Test whether a value is a collection: an Array or Matrix
//  * @param {*} x
//  * @returns {boolean} isCollection
//  */
// export function isCollection(x: any) {
//   return Array.isArray(x) || isMatrix(x)
// }
// export function isDenseMatrix(x: any) {
//   return (x && x.isDenseMatrix && x.constructor.prototype.isMatrix === true) || false
// }
// export function isSparseMatrix(x: any) {
//   return (x && x.isSparseMatrix && x.constructor.prototype.isMatrix === true) || false
// }
// export function isRange(x: any) {
//   return (x && x.constructor.prototype.isRange === true) || false
// }
// export function isIndex(x: any) {
//   return (x && x.constructor.prototype.isIndex === true) || false
// }
// export function isBoolean(x: any) {
//   return typeof x === `boolean`
// }
// export function isResultSet(x: any) {
//   return (x && x.constructor.prototype.isResultSet === true) || false
// }
// export function isHelp(x: any) {
//   return (x && x.constructor.prototype.isHelp === true) || false
// }
// export function isFunction(x: any) {
//   return typeof x === `function`
// }
// export function isDate(x: any) {
//   return x instanceof Date
// }
// export function isRegExp(x: any) {
//   return x instanceof RegExp
// }
// export function isObject(x: any) {
//   return !!(x && typeof x === `object` && x.constructor === Object && !isComplex(x) && !isFraction(x))
// }
// export function isNull(x: any) {
//   return x === null
// }
// export function isUndefined(x: any) {
//   return x === undefined
// }
// export function isAccessorNode(x: any) {
//   return (x && x.isAccessorNode === true && x.constructor.prototype.isNode === true) || false
// }
// export function isArrayNode(x: any) {
//   return (x && x.isArrayNode === true && x.constructor.prototype.isNode === true) || false
// }
// export function isAssignmentNode(x: any) {
//   return (x && x.isAssignmentNode === true && x.constructor.prototype.isNode === true) || false
// }
// export function isBlockNode(x: any) {
//   return (x && x.isBlockNode === true && x.constructor.prototype.isNode === true) || false
// }
export function isConditionalNode(x: any) {
  return (x && x.isConditionalNode === true && x.constructor.prototype.isNode === true) || false
}
export function isConstantNode(x: any) {
  return (x && x.isConstantNode === true && x.constructor.prototype.isNode === true) || false
}

// /* Very specialized: returns true for those nodes which in the numerator of
//    a fraction means that the division in that fraction has precedence over implicit
//    multiplication, e.g. -2/3 x parses as (-2/3) x and 3/4 x parses as (3/4) x but
//    6!/8 x parses as 6! / (8x). It is located here because it is shared between
//    parse.js and OperatorNode.js (for parsing and printing, respectively).

//    This should *not* be exported from mathjs, unlike most of the tests here.
//    Its name does not start with 'is' to prevent utils/snapshot.js from thinking
//    it should be exported.
// */
export function rule2Node(node: any) {
  return isConstantNode(node) || (isOperatorNode(node) && node.args.length === 1 && isConstantNode(node.args[0]) && `-+~`.includes(node.op))
}
// export function isFunctionAssignmentNode(x: any) {
//   return (x && x.isFunctionAssignmentNode === true && x.constructor.prototype.isNode === true) || false
// }
// export function isFunctionNode(x: any) {
//   return (x && x.isFunctionNode === true && x.constructor.prototype.isNode === true) || false
// }
// export function isIndexNode(x: any) {
//   return (x && x.isIndexNode === true && x.constructor.prototype.isNode === true) || false
// }
export function isNode(x: any) {
  return (x && x.isNode === true && x.constructor.prototype.isNode === true) || false
}
// export function isObjectNode(x: any) {
//   return (x && x.isObjectNode === true && x.constructor.prototype.isNode === true) || false
// }
export function isOperatorNode(x: any) {
  return (x && x.isOperatorNode === true && x.constructor.prototype.isNode === true) || false
}
export function isParenthesisNode(x: any): x is ParenthesisNode {
  return (x && x.isParenthesisNode === true && x.constructor.prototype.isNode === true) || false
}
// export function isRangeNode(x: any) {
//   return (x && x.isRangeNode === true && x.constructor.prototype.isNode === true) || false
// }
// export function isRelationalNode(x: any) {
//   return (x && x.isRelationalNode === true && x.constructor.prototype.isNode === true) || false
// }
export function isSymbolNode(x: any) {
  return (x && x.isSymbolNode === true && x.constructor.prototype.isNode === true) || false
}
// export function isChain(x: any) {
//   return (x && x.constructor.prototype.isChain === true) || false
// }
// export function typeOf(x: any) {
//   let t = typeof x
//   if (t === `object`) {
//     if (x === null) return `null`
//     if (isBigNumber(x)) return `BigNumber` // Special: weird mashup with Decimal
//     if (x.constructor && x.constructor.name) return x.constructor.name
//     return `Object` // just in case
//   }

//   return t // can be 'string', 'number', 'boolean', 'function', 'bigint', ...
// }

// #endregion
