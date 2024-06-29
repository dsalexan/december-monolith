import chalk from "chalk"
import Block from "../builder/block"
import { isArray as _isArray } from "lodash"

function isArray<TValue = unknown>(value: unknown): value is TValue[] {
  return _isArray(value)
}

function createBlock(blockFactory: any, unknownOrBlock: unknown) {
  const block = new Block(unknownOrBlock)
  if (unknownOrBlock instanceof Block) block._data = unknownOrBlock._data

  const styles = [] as string[]

  // then comes all functions in parentage chain
  let parent = blockFactory._parent
  while (parent) {
    if (parent._style) styles.push(parent._style)
    parent = parent._parent
  }

  block._style.push(...styles)
  // console.log(chalk.bold(`text:`), string)
  // console.log(chalk.bold(`style:`), styles.join(`, `))

  // then comes the style of the argument (if it is a block, that is)
  if (unknownOrBlock instanceof Block) {
    block._style.push(...unknownOrBlock._style)
    block._flags.push(...unknownOrBlock._flags)
  }

  // last funcion in chain should be most prioritest
  if (blockFactory._style) block._style.push(blockFactory._style)

  return block
}

const ANSI_STYLES = [
  `reset`,

  `regular`,
  `bold`,

  `dim`,

  `italic`,

  `underline`,

  `inverse`,

  `hidden`,

  `strikethrough`,

  `visible`,

  `black`,
  `red`,
  `green`,
  `yellow`,
  `blue`,
  `magenta`,
  `cyan`,
  `white`,

  `gray`,

  `grey`,

  `blackBright`,
  `redBright`,
  `greenBright`,
  `yellowBright`,
  `blueBright`,
  `magentaBright`,
  `cyanBright`,
  `whiteBright`,

  `bgBlack`,
  `bgRed`,
  `bgGreen`,
  `bgYellow`,
  `bgBlue`,
  `bgMagenta`,
  `bgCyan`,
  `bgWhite`,

  `bgGray`,

  `bgGrey`,

  `bgBlackBright`,
  `bgRedBright`,
  `bgGreenBright`,
  `bgYellowBright`,
  `bgBlueBright`,
  `bgMagentaBright`,
  `bgCyanBright`,
  `bgWhiteBright`,
]

const CONSOLE_STYLES = [
  { name: `number`, hex: `#1A1AA6` },
  { name: `n`, hex: `#1A1AA6` },
  { name: `boolean`, letter: `b`, hex: `#007a00` },
  { name: `b`, hex: `#007a00` },
  { name: `string`, hex: `#C80000` },
  { name: `s`, hex: `#C80000` },
]

// Build a prototype with all chainable functions
const chainingGetters = Object.create(null)

chainingGetters[`isPaint`] = {
  get() {
    return true
  },
}

for (const styleName of ANSI_STYLES) {
  chainingGetters[styleName] = {
    get() {
      const chainableFunction = chainableFunctionFactory(this, `ansi:${styleName}`)
      Object.defineProperty(this, styleName, { value: chainableFunction })
      return chainableFunction
    },
  }
}

chainingGetters[`hex`] = {
  get() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const generator = function (color: string) {
      const chainableFunction = chainableFunctionFactory(self, `ansi:hex:${color}`)
      // Object.defineProperty(self, `hex`, { value: chainableFunction })
      return chainableFunction
    }
    Object.defineProperty(self, `hex`, { value: generator })
    return generator
  },
}

// rgb(r: number, g: number, b: number, a?: number): Paint
chainingGetters[`rgb`] = {
  get() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const generator = function (r: number | [number, number, number, number], g: number, b: number, a: number = 1) {
      if (isArray(r)) {
        g = r[1]
        b = r[2]
        a = r[3] ?? 1
        r = r[0]
      }

      const chainableFunction = chainableFunctionFactory(self, `ansi:rgb:${[r, g, b, a].join(`,`)}`)
      // Object.defineProperty(self, `rgb`, { value: chainableFunction })
      return chainableFunction
    }
    Object.defineProperty(self, `rgb`, { value: generator })
    return generator
  },
}

// rgb(r: number, g: number, b: number, a?: number): Paint
chainingGetters[`bgRgb`] = {
  get() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const generator = function (r: number | [number, number, number, number], g: number, b: number, a: number = 1) {
      if (isArray(r)) {
        g = r[1]
        b = r[2]
        a = r[3] ?? 1
        r = r[0]
      }

      const chainableFunction = chainableFunctionFactory(self, `ansi:bgRgb:${[r, g, b, a].join(`,`)}`)
      // Object.defineProperty(self, `bgRgb`, { value: chainableFunction })
      return chainableFunction
    }
    Object.defineProperty(self, `bgRgb`, { value: generator })
    return generator
  },
}

chainingGetters[`web`] = {
  get() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const generator = function (color: string) {
      const chainableFunction = chainableFunctionFactory(self, `web:${color}`)
      // Object.defineProperty(self, `web`, { value: chainableFunction })
      return chainableFunction
    }
    Object.defineProperty(self, `web`, { value: generator })
    return generator
  },
}

chainingGetters[`opacity`] = {
  get() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const generator = function (a: number) {
      const chainableFunction = chainableFunctionFactory(self, `post:opacity:${a}`)
      return chainableFunction
    }
    Object.defineProperty(self, `opacity`, { value: generator })
    return generator
  },
}

chainingGetters[`identity`] = {
  get() {
    const chainableFunction = chainableFunctionFactory(this, `identity`)
    Object.defineProperty(this, `identity`, { value: chainableFunction })
    return chainableFunction
  },
}

for (const style of CONSOLE_STYLES) {
  chainingGetters[style.name] = {
    get() {
      const chainableFunction = chainableFunctionFactory(this, `ansi:hex:${style.hex}`)
      Object.defineProperty(this, style.name, { value: chainableFunction })
      return chainableFunction
    },
  }
}

const chainingPrototype = Object.defineProperties(() => {}, chainingGetters)

export default function chainableFunctionFactory(parent?: unknown, style?: string) {
  const blockFactory = (...args: unknown[]) => {
    // if (args.length > 1) debugger
    if (args.length === 1 && isArray(args[0]) && args[0] instanceof Block) debugger

    if (args.length === 1) {
      if (isArray(args[0])) return args[0].map(argument => createBlock(blockFactory, argument))
      else return createBlock(blockFactory, args[0])
    } else return args.map(argument => createBlock(blockFactory, argument))
  }

  Object.setPrototypeOf(blockFactory, chainingPrototype)

  if (style === `reset`) {
    blockFactory._parent = undefined
    blockFactory._style = undefined
  } else {
    if (parent) blockFactory._parent = parent
    if (style) blockFactory._style = style
  }

  return blockFactory
}
