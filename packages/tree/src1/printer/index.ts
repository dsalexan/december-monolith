import { cloneDeep, groupBy, indexOf, isEqual, isNil, isNumber, isRegExp, isString, last, max, range, sum, unzip } from "lodash"
import { SyntaxNode } from "../node"
import { EnclosureSyntax } from "../syntax/enclosure"
import churchill, { Block, paint, Paint } from "../logger"
import { numberToLetters } from "../utils"
import { PatternSyntax } from "../syntax/pattern"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export default class NodePrinter {
  node: SyntaxNode
  logger: typeof _logger

  options: Partial<PrinterOptions> = {}

  constructor(logger?: typeof _logger) {
    this.logger = logger ?? _logger
  }

  _options(options: Partial<PrinterOptions>) {
    this.options = {
      explicitizeImplicitMultiplication: options.explicitizeImplicitMultiplication ?? false,
      //
      ...cloneDeep(options),
    }
  }

  characters(node: SyntaxNode) {
    if (!node.isRoot()) return this

    const text = node.value!

    const characters = [...text]
    const charactersAndIndexes = characters.map((character, index) => [index, character])

    const separatorSize = text.length.toString().length

    const [indexes, allCharacters] = unzip(charactersAndIndexes) as [number[], string[]]

    console.log(indexes.map(index => index.toString().padEnd(separatorSize)).join(` `))
    console.log(allCharacters.map(character => character.padEnd(separatorSize)).join(` `))
    // this.logger.add(paint.grey(indexes.map(index => index.toString().padEnd(separatorSize)).join(` `))).debug()
    // this.logger.add(paint.grey(allCharacters.map(character => character.padEnd(separatorSize)).join(` `))).debug()

    return this
  }

  vertical(node: SyntaxNode, { tabSize = 0 } = {}) {
    const tab = tabSize > 0 ? `  `.repeat(tabSize) : ``
    const value = node.value === null ? `—` : `"${node.value}"`
    console.log(`${tab}[${node.context}] ${value}`)

    for (const child of node.children) {
      this.vertical(child as SyntaxNode, { tabSize: tabSize + 1 })
    }

    return this
  }

  horizontal(node: SyntaxNode, options: Partial<HorizontalOptions> = {}) {
    this._options(options)

    const height = node.height()
    const width = 250

    const cap = this.cap(width)

    let LEVELS = [...Array(height).keys()]
    // LEVELS = [0]

    const { grid, gap } = this._grid(node)
    const bands = this._bands(grid)
    const { header, tree } = this._tree(node, gap, bands)

    const padLevel = String(height).length

    // debugger
    // TODO: Prefix
    for (const blocks of header) {
      for (const line of cap(blocks)) this.logger.add(` `.repeat(padLevel), `  `, ...line).debug()
    }

    for (let level = 0; level < height; level++) {
      if (!LEVELS.includes(level)) continue

      const lines = [...cap(tree[level].text), ...cap(tree[level].syntax)]
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (i === 0) this.logger.add(paint.italic.grey(String(level + node.level).padEnd(padLevel, ` `))) // padding + prefix
        else this.logger.add(` `.repeat(padLevel)) // padding (no prefix)

        this.logger.add(`  `, ...line) // content
        this.logger.debug()
      }
    }

    return this
  }

  /** creates a function that generate capped lines based on max width */
  cap(maxWidth: number) {
    return (originalLine: Block[]) => {
      if (maxWidth === Infinity) return [originalLine]

      const lines = [] as Block[][]

      interface LengthedBlocks {
        content: Block[]
        length: number
      }
      let currentLine: LengthedBlocks = { content: [], length: 0 }

      // loop through each block in line
      let previousBlockIndex = -1
      let blockIndex = 0
      let blockOffset = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // remaing width in line
        const remainingWidth = maxWidth - currentLine.length

        // fetch next block
        let block = originalLine[blockIndex++]

        // reset block offset if new block was fetched
        if (blockIndex > previousBlockIndex) {
          previousBlockIndex = blockIndex
          blockOffset = 0
        }

        // offset block content if necessary
        if (blockOffset > 0) {
          block = block._clone()
          block._data = String(block._data).slice(blockOffset)
        }

        const length = String(block._data).length

        let partialLine: LengthedBlocks = { content: [block], length }
        // slice block if it is too long
        if (length > remainingWidth) {
          // slice block to fit remaining width
          const slicedBlock = block._clone()
          slicedBlock._data = String(slicedBlock._data).slice(0, remainingWidth)

          // update partial line with sliced block
          partialLine.content = [slicedBlock]
          partialLine.length = remainingWidth

          // fix next iteration
          blockOffset += remainingWidth // advance offset for block
          blockIndex-- // revert block index advance
        }

        // ERROR: Something went wrong
        if (partialLine.length + currentLine.length > maxWidth) debugger

        // update current line
        currentLine.content.push(...partialLine.content)
        currentLine.length += partialLine.length

        // line is full, add it to lines
        if (currentLine.length === maxWidth) {
          lines.push(currentLine.content)
          currentLine = { content: [], length: 0 } // reset currentLine
        }

        // break loop if all blocks are processed
        if (blockIndex >= originalLine.length) break
      }

      // there was something in current line, but it did not reach max width (add it anyway)
      if (currentLine.length > 0) lines.push(currentLine.content)

      return lines
    }
  }

  _grid1(node: SyntaxNode) {
    // initialize grid by level
    const H = node.height()
    const grid = range(0, H).map(() => []) as NodeToken[][] // [level, 1 -> H][column, 0 -> N]
    const gap = [] as number[] // 0 -> N+1

    // get lowest possible flat representation of node
    const tokens = this._repr(node)

    const N = tokens.length
    // initialize grid's leaf and "root" level
    for (let y = 0; y < N; y++) grid[0][y] = { node: node, fn: `repr` }
    for (let y = 0; y < N; y++) {
      const token = tokens[y]

      grid[H - 1][y] = token

      const [before, after] = token.padding ?? [0, 0]

      gap[y] = max([gap[y] ?? 0, before])!
      gap[y + 1] = max([gap[y + 1] ?? 0, after])!
    }

    // for inbetween levels, allocate parent nodes above
    for (let level = H - 2; level > 0; level--) {
      const currentLevel = grid[level]
      const nextLevel = grid[level + 1]

      for (let y = 0; y < N; y++) {
        const token = nextLevel[y]

        if (token.node.level <= level) {
          // node is yet to reach its first level, ignore parent
          currentLevel[y] = token
        } else {
          // node is above level, find parent and create new token for it
          const parent = token.node.parent as SyntaxNode
          if (!parent) debugger

          currentLevel[y] = { node: parent, fn: `repr` }
          if (token.padding) currentLevel[y].padding = [token.padding[0], token.padding[1]]
        }
      }
    }

    return { grid, gap }
  }

  _grid(node: SyntaxNode) {
    // initialize grid by level (with entire tree)
    const root = node.tree.root
    const H = root.height()
    const grid = range(0, H).map(() => []) as NodeToken[][] // [level, 1 -> H][column, 0 -> N]

    // get lowest possible flat representation of node
    const tokens = this._repr(node)
    const N = tokens.length // number of "columns" in grid

    // initialize grid's leaf and root level
    for (let y = 0; y < N; y++) grid[0][y] = { node: root, fn: `repr` }
    for (let y = 0; y < N; y++) grid[H - 1][y] = tokens[y]

    // iterate all levels from bottom to top (starting at leaves' parent level)
    for (let h = H - 2; h > 0; h--) {
      const level = grid[h]
      const childrenLevel = grid[h + 1] // for first iteration, same as "leafLevel"

      // for each "column" in grid
      for (let column = 0; column < N; column++) {
        const childToken = childrenLevel[column] // for first iteration, same as "leaf node token"

        // if child token's level is less or equal to current height, a.k.a. token's origin is above, will happen in a later iteration
        if (childToken.node.level <= h) {
          // pass token to be evaluated in next iteration
          level[column] = childToken
        } else {
          // child token's level is above current height, a;k.a. token's origin is in some offspring of current level, already had an iteration

          const parent = childToken.node.parent as SyntaxNode
          if (!parent) debugger

          // create a new token for parent
          level[column] = { node: parent, fn: `repr` }
          if (childToken.padding) level[column].padding = [childToken.padding[0], childToken.padding[1]]
        }
      }
    }

    // // reset node level to all repr
    // for (let y = 0; y < N; y++) grid[node.level][y] = { node: node, fn: `repr` }

    // get subset of grid, >= node.level
    const subGrid = grid.slice(node.level)

    // initialize gap based on leaf level
    //    gap DOEST NOT consider whole tree, just level > node.level
    const gap = [] as number[] // 0 -> N+1
    for (let y = 0; y < N; y++) {
      const token = tokens[y]
      const [before, after] = token.padding ?? [0, 0]

      gap[y] = max([gap[y] ?? 0, before])!
      gap[y + 1] = max([gap[y + 1] ?? 0, after])!
    }

    return { grid: subGrid, gap }
  }

  _bands(grid: NodeToken[][]) {
    const H = grid.length // number of levens
    const N = grid[0].length // number of columns at leaf

    // parse grid into bands
    const bands = range(0, H).map(() => []) as NodeBand[][] // [level, 1 -> H]
    for (let level = 0; level < H; level++) {
      const currentLevel = grid[level]

      let band: NodeBand | undefined = undefined
      for (let y = 0; y < N; y++) {
        const token = currentLevel[y]

        if (band?.node.context !== token.node.context) {
          // close band
          if (band) bands[level].push(band)

          // initialize new band
          band = { node: token.node, columns: [y, y], baseTokens: [token] }
        } else {
          // extend band
          band.columns[1] = y
          band.baseTokens.push(token)
        }
      }
      if (band) bands[level].push(band)
    }

    return bands
  }

  _tree(node: SyntaxNode, gap: number[], bands: NodeBand[][]) {
    const H = bands.length // number of levels

    //    effective representation
    const width = [] as number[] // 0 -> N
    const textCells = range(0, H).map(() => []) as Cell[][] // [level, 1 -> H][column, 0 -> N]
    const syntaxCells = range(0, H).map(() => []) as Cell[][] // [level, 1 -> H][column, 0 -> N]

    // 1. bands -> tokens -> cells
    for (let i = 0; i < H; i++) {
      const options: TokenToBlockOptions = { level: i + node.level, explicitizeImplicitMultiplication: this.options.explicitizeImplicitMultiplication }

      const textTokens = [] as NodeToken[]
      const syntaxTokens = [] as NodeToken[]

      for (const band of bands[i]) {
        const nodesLevel = band.node.level === i + node.level

        textTokens.push(...this._band(band, gap))

        const syntaxBand: NodeBand = {
          node: band.node,
          columns: [...band.columns],
          baseTokens: [...band.baseTokens],
        }

        // if at node's level, i only want its context
        if (nodesLevel) syntaxBand.baseTokens = [`context`]

        const tokens = this._band(syntaxBand, gap)

        // if not at node's level, replace all characters by whitespace
        if (!nodesLevel) tokens.forEach(token => (token.asWhitespace = true))

        syntaxTokens.push(...tokens)
      }

      textCells[i].push(...this._tokens(textTokens, options))
      syntaxCells[i].push(...this._tokens(syntaxTokens, { ...options, ignoreBoldAtLevel: true }))
    }

    // 2. get max width content from cells of same column
    for (let i = 0; i < H; i++) {
      const allCells = [...textCells[i], ...syntaxCells[i]]

      for (let c = 0; c < allCells.length; c++) {
        const cell = allCells[c]
        if (cell.columns === undefined) debugger

        if (cell.columns[0] === cell.columns[1]) {
          const column = cell.columns[0]
          width[column] = max([width[column] ?? 0, cell.width])!
        }
      }
    }

    // 3. cells -> blocks -> print
    const tree = [] as { text: Block[]; syntax: Block[] }[]
    for (let i = 0; i < H; i++) {
      const textBlocks = this._cells(textCells[i], width, gap)
      const syntaxBlocks = this._cells(syntaxCells[i], width, gap, { showBracket: true, alignment: `center` })

      tree[i] = {
        text: textBlocks,
        syntax: syntaxBlocks,
      }
    }

    // 4. root cells -> header
    const text = this._repr(node)
      .map(token => this._token(token, { level: node.level, hideNil: true }))
      .flat()
      .map(block => block._data)
      .join(``)
    const L = text.length // number of characters

    const headerCells = [] as Cell[]

    let column = -1
    for (const originalCell of textCells[0]) {
      // clone cell
      const cell: Cell = {
        source: originalCell.source,
        content: [...originalCell.content],
        width: originalCell.width,
        padding: [...originalCell.padding],
        columns: [...originalCell.columns],
      }

      // change content to numbers
      const blocks = [] as Block[]
      let width = 0

      if (originalCell.source.syntax.name === `nil`) {
        // for nil, ignore all contents (they dont exist really)

        for (const block of originalCell.content) {
          const originalLength = String(block._data).length
          if (originalLength > 0) {
            blocks.push(paint.identity(` `.repeat(originalLength)))
            width += originalLength
          }
        }
      } else {
        for (const block of originalCell.content) {
          const originalLength = String(block._data).length

          for (let i = 0; i < originalLength; i++) {
            column += 1

            // ADDING NEW COLUMN
            let style = paint.blue
            // if (column % 2 === 0) style = paint.green
            if (Math.floor(column / 10) % 2 === 0) style = paint.green

            const text = last([...String(column)])!
            blocks.push(style(text))
          }

          width += originalLength
        }
      }

      cell.content = blocks
      cell.width = width

      headerCells.push(cell)
    }

    // 4.5. log10 headerss
    const otherHeaderCells = [] as Cell[][] // []
    const T = Math.floor(Math.log10(column)) + 1

    for (let t = 0; t < T - 1; t++) {
      otherHeaderCells[0] = []

      let FACTOR = 10
      let cellIndex = 0
      let blockIndex = 0
      let characterIndex = -1
      for (let x = 0; x <= Math.floor(column / FACTOR); x++) {
        const text = String(x * FACTOR)

        // ADDING NEW COLUMN
        let style = paint.blue
        // if (column % 2 === 0) style = paint.green
        if (x % 2 === 0) style = paint.green

        const cell: Cell = {
          source: null as any,
          content: [style.bold(text)],
          width: 0,
          padding: [0, 0],
          columns: [0, 0],
        }
        if (x === 0 && cellIndex === 0) {
          if (headerCells[0].padding[0] > 0) cell.content.unshift(paint.red.bold(` `.repeat(headerCells[0].padding[0])))
        }

        let columns = [] as number[]
        let paddingSize: number | undefined = 0
        for (; cellIndex < headerCells.length; cellIndex++) {
          const originalCell = headerCells[cellIndex]

          let sumColumnWidth = blockIndex === 0

          let cellWidth = 0
          let alpha = 0
          for (; blockIndex < originalCell.content.length; blockIndex++) {
            const block = originalCell.content[blockIndex]

            const isNumber = /^[0-9]$/.test(String(block._data))
            if (isNumber) {
              // check if "ten" is changed
              const number = parseInt(String(block._data))
              characterIndex++
              alpha = Math.floor(characterIndex / FACTOR)

              if (alpha > x) {
                // revert character index advance
                characterIndex--
                break
              }
            }

            cellWidth += String(block._data).length
          }

          if (sumColumnWidth && blockIndex === originalCell.content.length) paddingSize += sum(range(originalCell.columns[0], originalCell.columns[1] + 1).map(i => width[i]))
          else paddingSize += cellWidth

          if (alpha > x) break

          if (!columns.includes(originalCell.columns[0])) columns.push(originalCell.columns[0])
          if (!columns.includes(originalCell.columns[1])) columns.push(originalCell.columns[1])
          blockIndex = 0
        }

        // paddingSize = 0
        paddingSize += sum(columns.map(column => gap[column + 1]))
        paddingSize -= text.length

        // if (x === 0) paddingSize = 19 - text.length

        if (paddingSize > 0) cell.content.push(paint.magenta.bold(` `.repeat(paddingSize)))
        cell.width = sum(cell.content.map(block => String(block._data).length))
        otherHeaderCells[0].push(cell)
      }
    }

    // const header = [...otherHeaderCells.map(cells => this._cells(cells, width, gap, { showBracket: false, alignment: `left` })), this._cells(headerCells, width, gap)]
    // const header = headerCells.map(cells => this._cells(cells, width, gap))
    // const header = [...otherHeaderCells.map(cells => this._cells(cells, width, gap)), this._cells(headerCells, width, gap)]
    const header = [...otherHeaderCells.map(cells => cells.map(cell => this._cell(cell, cell.width)).flat()), this._cells(headerCells, width, gap)]

    return { tree, header }
  }

  // #region UTILS

  /** returns a string representation of a node (actually a sequence of tokens) */
  _repr(node: SyntaxNode): NodeToken[] {
    if (node.children.length === 0) return [{ node, fn: `value` }]

    const childrenClusters = node.children.map(child => this._repr(child as SyntaxNode))

    // flatten offspring nodes
    const tokens = [] as NodeToken[]

    if (node.syntax.name === `list` || node.syntax.name === `root`) {
      tokens.push(...childrenClusters.flat())
    } else if (node.syntax.type === `enclosure`) {
      tokens.push({ node, fn: `opener`, padding: [1, 1] })
      tokens.push(...childrenClusters.flat())
      tokens.push({ node, fn: `closer`, padding: [1, 1] })
    } else if (node.syntax.type === `separator` || node.syntax.name === `implicit_multiplication`) {
      tokens.push(...childrenClusters[0]!)
      for (let i = 1; i < childrenClusters.length; i++) {
        const children = childrenClusters[i]

        tokens.push({ node, fn: `value`, padding: [1, 1] })
        tokens.push(...children)
      }
    } else if (node.syntax.type === `pattern`) {
      const syntax = node.syntax as PatternSyntax

      // only master nodes have some specific template I say
      if (node.syntaxSymbol !== `master`) tokens.push(...childrenClusters.flat())
      else if (node.syntax.name === `if`) {
        tokens.push({ node, fn: `constant`, constant: `$if(`, padding: [1, 1] })
        tokens.push(...childrenClusters[0])
        tokens.push({ node, fn: `constant`, constant: `THEN` })
        tokens.push(...childrenClusters[1])
        tokens.push({ node, fn: `constant`, constant: `ELSE` })
        tokens.push(...childrenClusters[2])
        tokens.push({ node, fn: `constant`, constant: `)`, padding: [1, 1] })
      } else if (node.syntax.name === `function` || node.syntax.name === `eval`) {
        tokens.push(...childrenClusters[0])
        tokens.push({ node, fn: `constant`, constant: `(`, padding: [0, 1] })
        tokens.push(...childrenClusters[1])
        tokens.push({ node, fn: `constant`, constant: `)`, padding: [1, 1] })
      } else if (node.syntax.name === `invoker`) {
        tokens.push(...childrenClusters[0])
        tokens.push({ node, fn: `constant`, constant: `::`, padding: [0, 0] })
        tokens.push(...childrenClusters[1])
      } else {
        for (const c of childrenClusters) tokens.push(...c)

        // // generic print based on printing plans
        // const children = node.children as SyntaxNode[]

        // for (const { matchingSequence, template, optional } of syntax._printingPlans) {
        //   // find all possible starts for sequence
        //   let starts = range(0, children.length).filter(i => children[i].isSyntax(syntax.name, matchingSequence[0]))

        //   // check if sequence matches from each start
        //   const possibleSequences = starts.map(start => range(start, start + matchingSequence.length).map(i => children[i]))
        //   const DEBUG__possibleSequences = possibleSequences.map(sequence => sequence.map(node => node.syntaxSymbol))
        //   const matches = possibleSequences.filter(sequence =>
        //     isEqual(
        //       sequence.map(node => node.syntaxSymbol),
        //       matchingSequence,
        //     ),
        //   )

        //   // if optional and no matches, continue
        //   if (matches.length === 0 && optional) continue

        //   // WARN: Untested
        //   if (matches.length !== 1) debugger

        //   const sequence = matches[0]

        //   // convert sequence into tokens (based on template)
        //   for (const indexOrText of template) {
        //     if (isString(indexOrText)) tokens.push({ node, fn: `constant`, constant: indexOrText, padding: [1, 1] })
        //     else {
        //       const child = sequence[indexOrText]
        //       const childTokens = this._repr(child)

        //       // inject padding
        //       let padding = [...(childTokens[0].padding ?? [0, 0])] as [number, number]
        //       padding[0] = Math.max(1, padding[0])
        //       childTokens[0].padding = [...padding]

        //       const n = childTokens.length - 1

        //       padding = [...(childTokens[n].padding ?? [0, 0])] as [number, number]
        //       padding[1] = Math.max(1, padding[1])
        //       childTokens[n].padding = [...padding]

        //       tokens.push(...childTokens)
        //     }
        //   }
        // }
      }
    } else {
      debugger
    }

    return tokens
  }

  /** parses a node band into an array of tokens */
  _band(band: NodeBand, gap: number[]): NodeToken[] {
    const tokens = [] as NodeToken[]

    const { node, baseTokens, columns } = band
    const N = columns[1] - columns[0] + 1

    const mismatchBetweenColumns = baseTokens.length !== N
    const hasRepr = baseTokens.some(tokenOrFn => tokenOrFn === `repr` || (tokenOrFn as any).fn === `repr`)

    // build new list of tokens specific to this band
    if (hasRepr) {
      const repr = this._repr(node)

      const reprMismatchBetweenColumns = repr.length !== N

      for (let j = 0; j < repr.length; j++) {
        const column = columns[0] + j
        const token = repr[j]

        token.columns = [column, column]
        token.padding = [gap[column], gap[column + 1]]
      }

      tokens.push(...repr)
    } else {
      // ERROR: How to deal with more then one thing for many columns?
      if (mismatchBetweenColumns && baseTokens.length !== 1) debugger

      const dynamicTokens = [] as NodeToken[]
      for (let j = 0; j < baseTokens.length; j++) {
        const baseToken = baseTokens[j]

        // const token = { node, fn } as NodeToken
        const token = createNodeToken(isString(baseToken) ? { node, fn: baseToken } : baseToken)

        if (!mismatchBetweenColumns) {
          // if there is no mismatch each fn correspond to a column
          const column = columns[0] + j

          token.columns = [column, column]

          // specify padding based on grid/gap
          token.padding = [gap[column], gap[column + 1]]
        }

        dynamicTokens.push(token)
      }

      // if there is a mismatch
      if (mismatchBetweenColumns) {
        // band.columns -> token.columns
        dynamicTokens[0].columns = [...columns]
        dynamicTokens[0].padding = [gap[columns[0]], gap[columns[1]]]
      } else if (dynamicTokens.length !== 1) {
        // ERROR: How to deal with more then one thing for many columns?
        debugger
      }

      for (const token of dynamicTokens) {
        if (token.columns === undefined) debugger
        if (token.padding === undefined) debugger
      }

      tokens.push(...dynamicTokens)
    }

    return tokens
  }

  /** parses a list of tokens into an array of cells ("pre-blocks") */
  _tokens(tokens: NodeToken[], options: TokenToBlockOptions): Cell[] {
    const cells = [] as Cell[]

    for (const token of tokens) {
      if (token.columns === undefined) debugger

      const [before, after] = token.padding ?? [0, 0]
      const blocks = this._token(token, options)

      const cell: Cell = {
        source: token.node,
        content: blocks,
        padding: [before, after],
        columns: token.columns!,
        width: sum(blocks.map(block => String(block._data).length)),
      }

      cells.push(cell)
    }

    return cells
  }

  /** parses a token into an array of blocks for printing */
  _token(token: NodeToken, options: TokenToBlockOptions): Block[] {
    const blocks = [] as Block[]

    const { node, fn } = token

    const isAtNodesLevel = node.level === options.level

    let text = [node.context]

    // if (node.unbalanced.length > 0) debugger
    // if (token.node.value === `a` && options.level === 4) debugger

    if (fn === `opener` || fn === `closer`) {
      const enclosureSyntax = node.syntax as EnclosureSyntax
      text = [enclosureSyntax[fn] as string]
    } else if (fn === `value`) {
      if (node.value === undefined) debugger

      let _value = node.value!
      if (node.syntax.tags.includes(`default_value:empty`) && isNil(_value)) {
        _value = ``

        if (options.explicitizeImplicitMultiplication) _value = `*`
      }
      text = [_value]
      if (node.syntax.name === `nil` && !options.hideNil) text = [isAtNodesLevel ? `⌀` : ` `]

      // TODO: RENDER UNBALANCED INDEXES DIFFERENTLY
      // node.parent?.unbalancedS
    } else if (fn === `context`) {
      text = [node.context]

      if (node.syntax.name === `string`) text = [numberToLetters(node.id)]
      else if (node.syntax.name === `number`) text = [`n${numberToLetters(node.id)}`]
      else if (node.syntax.name === `whitespace`) text = [` `]
      else if (node.syntax.name === `nil`) text = [`⌀`]
      else if (node.syntax.name === `list`) {
        if (node.children.length === 1 && (node.children[0] as SyntaxNode).syntax.name === `nil`) text = [node.prefix]
      }
    } else if (fn === `constant`) {
      if (isNil(token.constant)) debugger
      text = [String(token.constant)]
    } else {
      debugger
    }

    // replace characters by whitespaces if necessary
    if (token.asWhitespace) {
      const textLength = sum(text.map(t => String(t).length))
      text = [textLength === 0 ? `` : ` `.repeat(text.length)]
    }

    let style = node.color

    const ancestorAtLevel = node.ancestor(options.level)! as SyntaxNode
    const invertedHighlight = ancestorAtLevel && ancestorAtLevel.syntax.type === `pattern` && [`if`, `function`, `eval`].includes(ancestorAtLevel.syntax.name)

    // get style at specific level
    if (node.level < options.level) {
      // if node is from past generations
      // STYLES HERE ARE APPLIED IF THE NODE IS FROM PAST GENERATIONS, SMALLER LEVEL, IF THERE SHOULD NOT BE FOCUS ON IT

      style = paint.grey
    } else if (node.level > options.level) {
      // if node is from future generations
      // STYLES HERE ARE APPLIED IN NODES FROM FUTURE GENERATIONS, A.K.A. CHILDREN FROM THE NODE RELEVANT TO THE LEVEL

      if (!ancestorAtLevel) debugger
      style = ancestorAtLevel.color

      if (ancestorAtLevel.syntax.name === `list`) style = style.dim

      if (ancestorAtLevel.syntax.type === `separator`) style = style.dim

      if (ancestorAtLevel.syntax.type === `pattern` && ancestorAtLevel.syntaxSymbol === `master`) {
        if (invertedHighlight) style = style.bold
        else style = style.dim
      }

      // if (ancestorAtLevel.syntax.type === `pattern` && ancestorAtLevel.syntaxSymbol === `master`) {
      //   const textIsWhitespace = text.every(t => t.match(/^\s+$/))

      //   if (fn === `value` && !textIsWhitespace) {
      //     // replace content for symbol
      //     const target = (node.level === options.level + 1 ? node : node.ancestor(options.level + 1)!) as SyntaxNode
      //     if (!target) debugger
      //     text = [target.syntaxSymbol!]
      //   } else {
      //     text = [` `]
      //   }

      //   style = style.dim.italic
      // }

      // const hasPatternSibling = !!ancestorAtLevel.siblings().find((sibling: SyntaxNode) => sibling.syntax.type === `pattern`)
      // if (hasPatternSibling && ![`pattern`].includes(node.syntax.type)) style = style.dim //fn === `context` ? style : style.dim
    }

    // STYLES HERE ARE APPLIED TO THE NODE AT LEVEL
    if (isAtNodesLevel && !options.ignoreBoldAtLevel && !options.dim) {
      if (ancestorAtLevel.syntax.type === `pattern` && ancestorAtLevel.syntaxSymbol === `master` && invertedHighlight) {
        style = style.dim
      } else if (node.syntax.name === `whitespace`) style = node.backgroundColor
      else {
        style = style.bold
      }
    }

    if (options.dim) style = style.dim

    blocks.push(...text.map(token => style(token)))

    return blocks
  }

  /** parses a list of cells into an array of blocks (applying padding) */
  _cells(cells: Cell[], widths: number[], gaps: number[], { showBracket, alignment }: { showBracket: boolean; alignment: `center` | `left` } = { showBracket: false, alignment: `center` }): Block[] {
    const blocksOrWhitespace = [] as (Block | WhitespaceToken)[]

    for (const cell of cells) {
      // const [before, after] = cell.padding
      const [before, after] = [gaps[cell.columns[0]], gaps[cell.columns[1] + 1]]

      let maxWidth = 0
      for (let column = cell.columns[0]; column <= cell.columns[1]; column++) {
        const width = widths[column]

        const afterPadding = column < cell.columns[1] ? gaps[column + 1] : 0

        maxWidth += width + afterPadding
      }

      if (before > 0) blocksOrWhitespace.push({ size: before })
      blocksOrWhitespace.push(...this._cell(cell, maxWidth, showBracket, alignment))
      if (after > 0) blocksOrWhitespace.push({ size: after })
    }

    const whitespaceStyle = paint.red.bold
    let whitespaceCharacter = ` `
    // whitespaceCharacter = `●`

    // remove repeating padding spaces
    const blocks = [] as Block[]
    for (let i = 0; i < blocksOrWhitespace.length; i++) {
      const block = blocksOrWhitespace[i] as Block

      const isWhitespace = isNumber((block as any).size)

      if (!isWhitespace) blocks.push(block)
      else {
        const whitespaces = [] as WhitespaceToken[]

        // advance i until next non whitespace (to group all whitespaces)
        while (i < blocksOrWhitespace.length) {
          const nextBlock = blocksOrWhitespace[i] as WhitespaceToken

          // if next block IS NOT whitespace, break loop and revert i BY ONE (so next block is consumed normally by the main loop)
          if (nextBlock.size === undefined) {
            i--
            break
          }

          // if IS whitespace, add to list and advance i
          whitespaces.push(nextBlock)
          i++
        }

        // fetch max size
        let size = whitespaces[0]?.size ?? 0
        if (whitespaces.length > 1) size = max(whitespaces.map(whitespace => whitespace.size))!

        // add to blocks as a block
        if (size > 0) blocks.push(whitespaceStyle(whitespaceCharacter.repeat(size)))
      }
    }

    return blocks
  }

  /** parses a cell into blocks (also applying cell dimensions, alignment and etc...) */
  _cell(cell: Cell, maxWidth: number, showBracket: boolean = false, alignment: `center` | `left` = `center`): Block[] {
    const blocks = [] as Block[]

    blocks.push(...cell.content)

    const isWhitespace = cell.content
      .map(block => String(block._data))
      .join(``)
      .match(/ +/)

    // if (maxWidth < cell.width) debugger TODO: WTF is this????????
    if (cell.width < maxWidth) {
      const remainingWidth = maxWidth - cell.width

      let beforeWidth = Math.floor(remainingWidth / 2)
      let afterWidth = remainingWidth - beforeWidth

      if (alignment === `left`) {
        beforeWidth = 0
        afterWidth = remainingWidth
      }

      let beforeBracket = 0,
        beforeDashes = 0
      let afterBracket = 0,
        afterDashes = 0

      if (showBracket && !isWhitespace) {
        if (beforeWidth > 1) {
          beforeBracket = 1
          beforeDashes = beforeWidth - beforeBracket
        }

        if (beforeWidth > 1 && afterWidth > 1) {
          afterBracket = 1
          afterDashes = afterWidth - afterBracket
        }

        beforeWidth -= beforeBracket + beforeDashes
        afterWidth -= afterBracket + afterDashes
      }

      if (beforeWidth > 0) blocks.splice(0, 0, paint.identity(` `.repeat(beforeWidth)))
      if (beforeDashes > 0) blocks.splice(0, 0, paint.grey(`-`.repeat(beforeDashes)))
      if (beforeBracket > 0) blocks.splice(0, 0, paint.grey(`|`))

      if (afterDashes > 0) blocks.push(paint.grey(`-`.repeat(afterDashes)))
      if (afterBracket > 0) blocks.push(paint.grey(`|`))
      if (afterWidth > 0) blocks.push(paint.identity(` `.repeat(afterWidth)))
    }

    return blocks
  }

  // #endregion

  // #region DEBUG

  /** prints flat repr at leaf level */
  _debug_leaf(node: SyntaxNode) {
    const tokens = this._repr(node)

    this.logger.add(paint.bold.white(`LEAF LEVEL`), paint.grey.italic(` (${node.context})`)).debug()
    const blocks = tokens.map(({ node, fn }) => node.color(node.context))

    const level = node.height() - 1

    // content
    this.logger
      .add(paint.italic.grey(node.height() - 1), `  `)
      .add(...tokens.map(token => [...this._token(token, { level: token.node.level }), paint.identity(` `)]).flat())
      .debug()

    // context
    this.logger
      .add(` `.repeat(String(level).length), `  `)
      .add(...blocks.map(block => [block, paint.identity(` `)]).flat())
      .debug()

    // fn
    this.logger
      .add(` `.repeat(String(level).length), `  `)
      .add(
        ...tokens
          .map(token => {
            const { node, fn } = token

            let text = this._token(token, { level: node.level, dim: true })
            let textLength = sum(text.map(block => String(block._data).length))
            if (textLength > 2) {
              textLength = 2
              text = [paint.grey.italic(`..`)]
            }

            const length = node.context.length

            if (length > textLength) {
              const remainingLength = length - textLength

              const before = Math.ceil(remainingLength / 2)
              const after = remainingLength - before

              if (before > 0) text.unshift(paint.identity(` `.repeat(before)))
              if (after > 0) text.push(paint.identity(` `.repeat(after)))
            }

            return [...text, paint.identity(` `)]
          })
          .flat(),
      )
      .debug()

    // band columns
    this.logger
      .add(` `.repeat(String(level).length), `  `)
      .add(
        ...blocks
          .map((block, index) => {
            const text = [String(index)]

            const length = String(block._data).length

            if (length > text[0].length) {
              const remainingLength = length - text[0].length

              const before = Math.ceil(remainingLength / 2)
              const after = remainingLength - before

              if (before > 0) text.unshift(` `.repeat(before))
              if (after > 0) text.push(` `.repeat(after))
            }

            return [paint.white.bold(text.join(``)), paint.identity(` `)]
          })
          .flat(),
      )
      .debug()

    return this.logger
  }

  /** prints grid repr of node hierarchy */
  _debug_grid(node: SyntaxNode, { grid, gap }: { grid: NodeToken[][]; gap: number[] }) {
    this.logger.add(paint.bold.white(`GRID`), paint.grey.italic(` (${node.context})`)).debug()

    const H = grid.length
    const N = grid[0].length

    // get padding for each column
    const columnPadding = range(0, N).map(column => {
      const nodes = range(0, H).map(level => grid[level][column])
      const lengths = nodes.map(({ node, fn }) => {
        let length = 0
        length += node.context.length
        length += fn.length + 2

        return length
      })

      return max(lengths)!
    })

    // show gaps
    this.logger.add(` `, `  `)
    for (let column = 0; column <= N; column++) {
      this.logger.add(` `, paint.white.bold(`${gap[column]}`), `  `)
      this.logger.add(` `.repeat(columnPadding[column] + 1))
    }
    this.logger.debug()

    // show grid
    for (let i = 0; i < H; i++) {
      const blocks = grid[i].map((token, column) => {
        const color = token.node.color

        let padding = columnPadding[column] + 1
        padding -= token.node.context.length
        padding -= token.fn.length + 2

        return [paint.identity(` `.repeat(String(gap[column]).length + 3)), color(token.node.context), color.dim(`[${token.fn}]`), paint.identity(` `.repeat(padding))]
      })

      this.logger.add(paint.italic.grey(i + node.level), `  `)
      this.logger.add(...blocks.flat())
      this.logger.debug()
    }

    return this.logger
  }

  /** prints bands repr of node hierarchy */
  _debug_bands(node: SyntaxNode, bands: NodeBand[][]) {
    this.logger.add(paint.bold.white(`BANDS`), paint.grey.italic(` (${node.context})`)).debug()

    const H = bands.length

    for (let i = 0; i < H; i++) {
      const band = bands[i].map(band => {
        const [start, end] = band.columns
        let range = `[${start}:${end}]`
        if (start === end) range = `[${start}]`

        const fns = [] as string[] // `[${band.fns.join(`,`)}]`

        let cursor = null as string | null
        let cursorSize = 0
        for (const baseToken of band.baseTokens) {
          const fn = isString(baseToken) ? baseToken : (baseToken as NodeToken).fn

          if (cursor === null) cursor = fn

          if (fn === cursor) cursorSize++
          else {
            fns.push(`${cursor}×${cursorSize}`)

            cursor = fn
            cursorSize = 1
          }
        }
        fns.push(`${cursor}×${cursorSize}`)

        return [band.node.color(band.node.context), band.node.color.italic.dim(range), band.node.color.italic.dim(`[${fns.join(`,`)}]`)]
      })

      this.logger.add(paint.italic.grey(i + node.level), `  `)
      this.logger.add(...band.flat())
      this.logger.debug()
    }

    return this.logger
  }

  _debug_tree(node: SyntaxNode, tree: { text: Block[]; syntax: Block[] }[]) {
    this.logger.add(paint.bold.white(`TREE`), paint.grey.italic(` (${node.context})`)).debug()

    const H = tree.length

    for (let level = 0; level < H; level++) {
      this.logger.add(paint.italic.grey(level))
      this.logger.add(`  `, ...tree[level].text).debug()
      this.logger.add(` `, `  `, ...tree[level].syntax).debug()
    }
  }

  _debug_pattern(node: SyntaxNode | undefined) {
    if (!node) {
      this.logger.add(paint.bold.red(`NO PATTERN SYMBOLS FOUND`)).debug()

      return
    }

    this.logger
      .add(paint.bold.white(`FOUND PATTERN SYMBOLS`)) //
      .add(paint.grey.italic(` (`))
      .add(paint.grey.italic.bold(node.context))
      .add(paint.grey.italic(`, `))
      .add(paint.grey.italic(node.syntax.name))
      .add(paint.grey.italic(`)`))
      .debug()

    const H = node.tree.root.height()

    // group childrens by syntax symbol
    const groups = node.groupChildrenBySyntaxSymbol(node.syntax.name)

    const symbolPadding = max(Object.keys(groups).map(symbol => symbol.length))!
    for (const [symbol, nodes] of Object.entries(groups)) {
      this.logger.add(` `.repeat(String(H).length + 1))
      this.logger.add(`  `)

      this.logger.add(paint.grey.italic(symbol.padEnd(symbolPadding, ` `)), `  `)

      this.logger.add(nodes[0].color.bold(nodes[0].context))
      for (const child of nodes.slice(1)) this.logger.add(paint.grey(`,`), child.color.bold(child.context))

      this.logger.debug()
    }
  }

  // #endregion

  // #region TEMPLATES

  static print_hierarchy(node: SyntaxNode) {
    const printer = new NodePrinter()

    printer.characters(node)
    console.log(``)

    // const { grid, gap } = printer._grid(node)
    // const bands = printer._bands(grid)

    printer.logger.add(paint.white(`----`)).debug()
    printer.horizontal(node)
  }

  // #endregion
}

function createNodeToken(originalToken: Partial<NodeToken>): NodeToken {
  const token = { ...originalToken } as NodeToken

  if (token.padding) token.padding = [...token.padding]
  if (token.columns) token.columns = [...token.columns]

  // validate node token
  if (originalToken.fn === `constant`) {
    if (isNil(token.constant)) debugger
  }

  return token
}

interface NodeToken {
  node: SyntaxNode
  fn: `opener` | `closer` | `value` | `repr` | `context` | `constant`
  padding?: [number, number]
  columns?: [number, number]
  asWhitespace?: boolean
  constant?: string | number
}

interface WhitespaceToken {
  size: number
}

interface HorizontalOptions extends PrinterOptions {
  colorize: boolean
  colorizeLevel: false | number
}

interface PrinterOptions {
  explicitizeImplicitMultiplication: boolean
}

interface TokenToBlockOptions {
  level: number
  ignoreBoldAtLevel?: boolean
  hideNil?: boolean
  dim?: boolean
  explicitizeImplicitMultiplication?: boolean
}

interface NodeBand {
  node: SyntaxNode
  columns: [number, number]
  baseTokens: (NodeToken | NodeToken[`fn`])[] // if only an fn, create a whole new NodeToken using this.node
}

interface Cell {
  source: SyntaxNode
  content: Block[]
  padding: [number, number]
  columns: [number, number]
  width: number
}
