import chalk from "chalk"
import Block from "../builder/block"

function createBlock(blockFactory: any, string: string) {
  const block = new Block(string)

  const styles = [] as string[]

  if (blockFactory._style) styles.push(blockFactory._style)

  let parent = blockFactory._parent
  while (parent) {
    if (parent._style) styles.push(parent._style)
    parent = parent._parent
  }

  block._style.push(...styles)
  // console.log(chalk.bold(`text:`), string)
  // console.log(chalk.bold(`style:`), styles.join(`, `))

  return block
}

const ANSI_STYLES = [
  `reset`,

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
  { name: `number`, hex: `#00008b` },
  { name: `n`, hex: `#00008b` },
  { name: `boolean`, letter: `b`, hex: `#006400` },
  { name: `v`, hex: `#006400` },
  { name: `string`, hex: `#AA1111` },
  { name: `s`, hex: `#AA1111` },
]

// Build a prototype with all chainable functions
const chainingGetters = Object.create(null)

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
    return function (color: string) {
      const chainableFunction = chainableFunctionFactory(self, `ansi:hex:${color}`)
      Object.defineProperty(self, `hex`, { value: chainableFunction })
      return chainableFunction
    }
  },
}

chainingGetters[`web`] = {
  get() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return function (color: string) {
      const chainableFunction = chainableFunctionFactory(self, `web:${color}`)
      Object.defineProperty(self, `web`, { value: chainableFunction })
      return chainableFunction
    }
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
    return createBlock(blockFactory, args.length === 1 ? `` + args[0] : args.join(` `))
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
