import { EventEmitter } from "@billjs/event-emitter"
import HTMLManager from "./htmlManager"

import logger from "../logger"

export type ComponentProperties = Record<string, unknown>

export default class Component<TProperties extends Record<string, unknown> = Record<string, never>> extends EventEmitter {
  protected manager: HTMLManager
  protected html!: JQuery<HTMLElement>
  protected properties!: TProperties

  constructor(manager: HTMLManager, properties: TProperties) {
    super()

    this.manager = manager

    if (properties) this.properties = properties
  }

  _find(html: JQuery<HTMLElement>, selector: string) {
    const element = html.find(selector)
    if (!element.length) {
      logger.add(`Could not find "${selector}"`).add(html).error()
      throw new Error(`Could not find "${selector}"`)
    }

    return element
  }

  hydrate(html: JQuery<HTMLElement>) {
    this.html = html

    this._hydrate()
    this._persist()
  }

  /**
   * Hydrate static html from handlebars with javascript funcionality
   */
  _hydrate() {
    // throw new Error(`_hydrate() not implemented`)
    // @ts-ignore
    const name = this.__proto__.constructor.name
    logger.add(`_hydrate() not implemented in component "${name}"`).warn()
  }

  /**
   * Subscribe to events to keep data persistent between sources/layers
   */
  _persist() {
    // TODO: Maybe all data syncing should be done here? Not half here, half in the sheet like before?
    // noop
  }
}
