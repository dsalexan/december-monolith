import Block from "../builder/block"
import chainableFunctionFactory from "./chainable"

// Build prototype for higher "color" module instance
const paint = chainableFunctionFactory()

interface ChainableFunction {
  (block: Block): Block
  (text: string | number | boolean): Block
  (blocks: Block[]): Block[]
  (...blocks: Block[]): Block[]
  (...text: unknown[]): Block[]
  (...args: (unknown | Block)[]): Block[]
}

export interface Paint extends ChainableFunction {
  identity: Paint
  web(color: string): Paint

  readonly isPaint: true

  readonly number: Paint
  readonly n: Paint

  readonly boolean: Paint
  readonly b: Paint

  readonly string: Paint
  readonly s: Paint

  /*
  @example
  ```
  import chalk = require('chalk');

  chalk.hex('#DEADED');
  ```
  */
  hex(color: string): Paint
  opacity(a: number): Paint

  rgb(rgb: [number, number, number]): Paint
  rgb(rgba: [number, number, number, number]): Paint
  rgb(r: number, g: number, b: number, a?: number): Paint

  bgRgb(rgb: [number, number, number]): Paint
  bgRgb(rgba: [number, number, number, number]): Paint
  bgRgb(r: number, g: number, b: number, a?: number): Paint

  /**
  Modifier: Resets the current color chain.
  */
  readonly reset: Paint

  readonly regular: Paint

  /**
  Modifier: Make text bold.
  */
  readonly bold: Paint

  /**
  Modifier: Emitting only a small amount of light.
  */
  readonly dim: Paint

  /**
  Modifier: Make text italic. (Not widely supported)
  */
  readonly italic: Paint

  /**
  Modifier: Make text underline. (Not widely supported)
  */
  readonly underline: Paint

  /**
  Modifier: Inverse background and foreground colors.
  */
  readonly inverse: Paint

  /**
  Modifier: Prints the text, but makes it invisible.
  */
  readonly hidden: Paint

  /**
  Modifier: Puts a horizontal line through the center of the text. (Not widely supported)
  */
  readonly strikethrough: Paint

  /**
  Modifier: Prints the text only when Chalk has a color support level > 0.
  Can be useful for things that are purely cosmetic.
  */
  readonly visible: Paint

  readonly black: Paint
  readonly red: Paint
  readonly green: Paint
  readonly yellow: Paint
  readonly blue: Paint
  readonly magenta: Paint
  readonly cyan: Paint
  readonly white: Paint

  /*
  Alias for `blackBright`.
  */
  readonly gray: Paint

  /*
  Alias for `blackBright`.
  */
  readonly grey: Paint

  readonly blackBright: Paint
  readonly redBright: Paint
  readonly greenBright: Paint
  readonly yellowBright: Paint
  readonly blueBright: Paint
  readonly magentaBright: Paint
  readonly cyanBright: Paint
  readonly whiteBright: Paint

  readonly bgBlack: Paint
  readonly bgRed: Paint
  readonly bgGreen: Paint
  readonly bgYellow: Paint
  readonly bgBlue: Paint
  readonly bgMagenta: Paint
  readonly bgCyan: Paint
  readonly bgWhite: Paint

  /*
  Alias for `bgBlackBright`.
  */
  readonly bgGray: Paint

  /*
  Alias for `bgBlackBright`.
  */
  readonly bgGrey: Paint

  readonly bgBlackBright: Paint
  readonly bgRedBright: Paint
  readonly bgGreenBright: Paint
  readonly bgYellowBright: Paint
  readonly bgBlueBright: Paint
  readonly bgMagentaBright: Paint
  readonly bgCyanBright: Paint
  readonly bgWhiteBright: Paint
}

export default paint as any as Paint
