import Builder, { BuilderOptions } from "./builder"
import Block, { Style } from "./builder/block"
import { LogLevel } from "./level"

export type GlobalLoggerContext = {
  MAX_NAME_LENGTH: number
  OPEN_GROUPS: { collapsed: boolean }[]
  CLOSE_GROUPS: number[]
  GROUPS: number
}

// declare global {
//   let __DECEMBER_LOGGER: GlobalLoggerContext

//   interface Window {
//     __DECEMBER_LOGGER: GlobalLoggerContext
//   }
// }

export interface LoggerOptions {
  separator: string
}

export default interface ILogger {
  name: string
  level: LogLevel

  initializeGlobalContext(): void

  child(name: string, level?: LogLevel): ILogger

  builder(options?: Partial<BuilderOptions>): Builder

  canPrint(level: LogLevel): boolean
  log(level: LogLevel, objects: any[], styles?: Style[][], options?: Partial<LoggerOptions>): void
  // logWithStyles(level: LogLevel, objects: any[], style: string[]): void
  // logObjects(level: LogLevel, objects: any[]): void

  group(collapsed?: boolean): void
  openGroup(collapsed?: boolean): void
  closeGroup(): void
}
