import { ConsoleLogger } from "@december/logger"

export { paint } from "@december/logger"
export type { Paint, Block, Builder } from "@december/logger"

const logger = new ConsoleLogger(`xii/compiler`, `debug`).builder()

export default logger
