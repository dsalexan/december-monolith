import { BrowserLogger } from "@december/logger"
import { MODULE_ID } from "../config"

export { paint } from "@december/logger"
export type { Paint } from "@december/logger"

const logger = new BrowserLogger(`xii/${MODULE_ID}`, `silly`).builder()

export type MarkerColor = [number, number, number, number]
export const MARKER_YELLOW = [255, 224, 60, 0.45] as MarkerColor
export const MARKER_GREEN = [60, 179, 113, 0.3] as MarkerColor
export const MARKER_BLACK = [0, 0, 0, 0.0085] as MarkerColor

export default logger
