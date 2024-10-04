import { ConsoleLogger } from "@december/logger"

export { paint, WithLogger, Builder } from "@december/logger"
export type { Paint, Block } from "@december/logger"

const logger = new ConsoleLogger(`xii/gca`, `silly`).builder()

export default logger
