// tsconfig => "module": "commonjs",

export type { default as ILogger } from "./interface"

// export { default as WinstonLogger } from "./winston"
export { default as ConsoleLogger } from "./console"
// export { default as BrowserLogger } from "./browser"

export { default as Builder } from "./builder/index"
export type { BuilderOptions as BuilderOptions } from "./builder"
export type { default as Block } from "./builder/block"

export { default as paint } from "./paint"
export type { Paint as Paint } from "./paint"

export * as Grid from "./grid"
