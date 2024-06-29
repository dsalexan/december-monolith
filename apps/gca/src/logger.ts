import { ConsoleLogger } from "@december/logger"

export { paint, Block } from "@december/logger"
export type { Paint } from "@december/logger"

const logger = new ConsoleLogger(`xii/gca`, `silly`).builder()

export default logger
