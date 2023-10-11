import { BrowserLogger } from "@december/logger"

export { paint } from "@december/logger"
export type { Paint } from "@december/logger"

const logger = new BrowserLogger(`xii/${`foundry`}`, `data`).builder()

export default logger
