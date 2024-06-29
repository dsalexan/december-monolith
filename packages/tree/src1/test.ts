import { Separator, Tree } from "./index"
// import { RecipeManager, DEFAULT_RECIPES } from "./recipe"

import logger, { Block, Paint, paint } from "./logger"
import { SyntaxNode } from "./node"
import TreeParser from "./parser"
import NodePrinter from "./printer"
import SyntaxManager, { DEFAULT_SYNTAXES, MATH_SYNTAXES, Pattern } from "./syntax/manager"
import { LOGICAL_SYNTAX_NAMES } from "./syntax/separator"

let originalEntry = `a + b`
// originalEntry = `(A) + b`
// originalEntry = `(A) + (b)`
originalEntry = `a + b)`
// originalEntry = `A,B`
// originalEntry = `,B`
// originalEntry = `a(b) , B`
// originalEntry = `,test1`
originalEntry = `,text0,((A) + c()b),test1,`
// originalEntry = `,test1:(*a)+ b`
//      GIVES
// originalEntry = `+500 argylle_1to ST:Money`
originalEntry = `=+500 to ST:Money`
originalEntry = `,+500 (*10) to ST:Money`
originalEntry = `test1,+500 (*10) to ST:Money`
originalEntry = `=+500 to ST:Remaining Funds listAs "Trading Character Points for Money"`
originalEntry = `, =+500 to ST:Remaining Funds listAs "Trading Character Points for Money" upto 10`
originalEntry = `,+500 to ST:Money, =+500 to ST:Remaining Funds UpTo 105 listAs "Trading Character Points for Money"`
//      IF
originalEntry = `,$if(a THEN b ELSE c) outside`
originalEntry = `,$if(a THEN b ELSE c) outside $if(d THEN e ELSE f)`
originalEntry = `,$if(g THEN a "b" c ELSE h) outside²`
originalEntry = `,$if(g THEN $if(a THEN b ELSE c) ELSE h) outside²`
originalEntry = `,$if(g THEN a outside b ELSE h) outside²`
originalEntry = `,$if(g THEN $if(a THEN b ELSE c) outside b ELSE h) outside²`
originalEntry = `,$if(g THEN $if(a THEN b ELSE c) outside $if(d THEN e ELSE f) ELSE h) outside²`
originalEntry = `,$if($if(z THEN true ELSE false) THEN $if(a THEN b ELSE c) outside $if(d THEN e ELSE f) ELSE h) outside²`
//        LOGICAL OPERATORS
originalEntry = `,a & b & c`
originalEntry = `a & b | c`
originalEntry = `a | b & c`
originalEntry = `a | b & c`
// originalEntry = `,$if(alpha & omega THEN b ELSE c) outside`
// originalEntry = `,$if(alpha & omega & delta THEN b ELSE c) outside`
// originalEntry = `a | b`
//      FUNCTION
// originalEntry = `$if[b]`
originalEntry = `@a`
originalEntry = `@a(b)`
originalEntry = `@name(b)`
originalEntry = `@name (b, c)`
originalEntry = `"AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0 `
//    INVOKER
originalEntry = `,a:b`
originalEntry = `aaaaaa::bbbbbb`
originalEntry = `,aaaaaa::bbbbbb::cccccc`
//    EVAL
originalEntry = `,$eval(1 + 2)`
// originalEntry = `,$solver(test1)`
// originalEntry = `,$solver("AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0)`
//    IMPLICIT MULTIPLICATION/NUMBER
originalEntry = `1*2`
originalEntry = `12.3* 10`
originalEntry = `12.3 * 10,00`
originalEntry = `1*d`
originalEntry = `1 + d`
originalEntry = `d  1`
originalEntry = `1* d1`
originalEntry = `1* 20d`
originalEntry = `d20`
originalEntry = `1d20`
originalEntry = `11d20 *20d`
originalEntry = `()d`
originalEntry = `(10 + 2)d`
//    MULTIPLICATION/DIVISION
originalEntry = `1+2`
originalEntry = `1*2`
originalEntry = `1 * 2`
originalEntry = `1*d`
originalEntry = `1 *d`
originalEntry = `1* d`
originalEntry = `9 + 81* d`
originalEntry = `9 + 81d * 7`
originalEntry = `9*8*7`
originalEntry = `9 * 81d * 7`
originalEntry = `(80 + 1)d * 7`
originalEntry = `(9 * 9)d * 7`
originalEntry = `9d * 9 * 7`
originalEntry = `2*@basethdice(ST:Punch)`
//    INVOKER AGAIN??? LOGICAL AGAIN???
originalEntry = `object ::level`
originalEntry = `object::level`
originalEntry = `1>10`
originalEntry = `1 > 10`
originalEntry = `level >= 10`
originalEntry = `object ::level > 10`
originalEntry = `object::level * 10`
originalEntry = `object::level > 10`
originalEntry = `object::level > ST:DX THEN 2*@basethdice(ST:Punch) ELSE 0`
originalEntry = `$if(object::level > ST:DX THEN 2*@basethdice(ST:Punch) ELSE 0)`
originalEntry = `AD:Claws (Blunt Claws)::level`
originalEntry = `"AD:Claws (Blunt Claws)::level"`

// const startsWithComma = originalEntry.startsWith(`,`)
// if (!startsWithComma) originalEntry = `,${originalEntry}`
// originalEntry = `⟨${originalEntry.trim()}⟩` // we pretend there is an enclosure around this, as seen when instantiating root node

const manager = new SyntaxManager([...DEFAULT_SYNTAXES, Pattern.IF, Pattern.FUNCTION, Pattern.EVAL, Pattern.INVOKER, ...MATH_SYNTAXES]) // LOGICAL_SYNTAX_NAMES
const parser = new TreeParser(manager)
const printer = new NodePrinter()

const tree = parser.parse(originalEntry)

printer.characters(tree.root)

// console.log(``)
// printer.vertical(tree.root)

console.log(``)

let targetNode = tree.root as SyntaxNode
targetNode = tree.root.children[0] as SyntaxNode

// DEBUG
const { grid, gap } = printer._grid(targetNode)
const bands = printer._bands(grid)
const { header, tree: _tree } = printer._tree(targetNode, gap, bands)

printer.logger.add(paint.white(`----`)).debug()
printer._debug_leaf(targetNode)
printer.logger.add(paint.white(`----`)).debug()
printer._debug_grid(targetNode, { grid, gap })
printer.logger.add(paint.white(`----`)).debug()
printer._debug_bands(targetNode, bands)
printer.logger.add(paint.white(`----`)).debug()
// printer._debug_tree(targetNode, _tree)
// printer.logger.add(paint.white(`----`)).debug()
// printer._debug_pattern(tree.root.filterBySyntax(`if`)?.[1])
// printer.logger.add(paint.white(`----`)).debug()

// printer.horizontal(tree.root as any)
printer.horizontal(targetNode, { explicitizeImplicitMultiplication: false })
