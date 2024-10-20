import { ConsoleLogger } from "@december/logger"

export { paint, WithLogger, Builder } from "@december/logger"
export type { Paint, Block } from "@december/logger"

const logger = new ConsoleLogger(`xii/simulator`, `debug`).builder({ separator: `` })

export default logger
