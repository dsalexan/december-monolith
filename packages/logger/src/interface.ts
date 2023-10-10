import Builder, { BuilderOptions } from "./builder"
import { LogLevel } from "./level"

export default interface ILogger {
  name: string
  level: LogLevel

  child(name: string, level?: LogLevel): ILogger

  builder(options?: Partial<BuilderOptions>): Builder

  log(level: LogLevel, ...message: string[]): void

  logWithStyles(level: LogLevel, objects: any[], style: string[]): void

  logObjects(level: LogLevel, objects: any[]): void

  group(collapsed?: boolean): void
  openGroup(collapsed?: boolean): void
  closeGroup(): void
}
