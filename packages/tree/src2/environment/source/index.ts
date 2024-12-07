import BaseSource from "./base"
import { ObjectSource } from "./object"

export { default as BaseSource } from "./base"

export type ISource = BaseSource | ObjectSource

export { ObjectSource } from "./object"

// TODO: Implement some sort of asyncronous source
