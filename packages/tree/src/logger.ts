import { ConsoleLogger } from "@december/logger"

export { paint } from "@december/logger"
export type { Paint, Block } from "@december/logger"

const logger = new ConsoleLogger(`xii/tree`, `silly`).builder({ separator: `` })

export default logger
