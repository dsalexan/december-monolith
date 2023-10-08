import { BrowserLogger } from "@december/logger"
import { MODULE_ID } from "../config"

export { paint } from "@december/logger"
export type { Paint } from "@december/logger"

const logger = new BrowserLogger(`dsalexan/${MODULE_ID}`, `data`).builder()

export default logger
