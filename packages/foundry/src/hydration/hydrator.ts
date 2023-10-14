import { EventEmitter } from "@billjs/event-emitter"
import HTMLHydrationManager from "./manager"

import logger from "../logger"

export type HydratorProperties = Record<string, unknown>

export default class Hydrator<TProperties extends HydratorProperties = Record<string, never>> extends EventEmitter {
  protected _manager: HTMLHydrationManager
  protected html!: JQuery<HTMLElement>
  protected properties!: TProperties
  protected childHydrators: Hydrator<any>[] = []

  get manager() {
    return this._manager
  }

  constructor(manager: HTMLHydrationManager, properties: TProperties) {
    super()

    this._manager = manager
    if (properties) this.properties = properties
  }

  _add(...hydrators: Hydrator<any>[]) {
    this.childHydrators.push(...hydrators)
  }

  _find(html: JQuery<HTMLElement>, selector: string) {
    const element = html.find(selector)
    if (!element.length) {
      logger.add(`Could not find "${selector}"`).add(html).error()
      throw new Error(`Could not find "${selector}"`)
    }

    return element
  }

  /**
   * attach the html to the hydrator, the only hydration method that should be overriden ALWAYS
   */
  _attach(html: JQuery<HTMLElement>) {
    this.html = html

    return this
  }

  /**
   * Attach new elements to hydrator, an then call hydrate for that specific element (not every hydrator has a individual implementation for _hydrate)
   */
  _update(newHtml: JQuery<HTMLElement>) {
    const length = this.html.length
    const elements = newHtml.toArray()

    this.html.pushStack(elements)
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const index = length + i

      this._hydrateElement(element, index)
    }

    return this
  }

  /**
   * Subscribe to events to keep data persistent between sources/layers
   */
  _persist() {
    if (this.childHydrators.length === 0) {
      // @ts-ignore
      const name = this.__proto__.constructor.name
      logger.add(`_persist() not implemented in hydrator "${name}"`).warn()
    }

    this.childHydrators.map(hydrator => hydrator._persist())

    return this
  }

  /**
   * Hydrate static html from handlebars with javascript funcionality
   */
  _hydrate() {
    if (this.childHydrators.length === 0) {
      // @ts-ignore1
      const name = this.__proto__.constructor.name
      logger.add(`_hydrate() not implemented in hydrator "${name}"`).warn()
    }

    if (this.html.length) {
      const elements = this.html.toArray()
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i]
        this._hydrateElement(element, i)
      }
    }

    this.childHydrators.map(hydrator => hydrator._hydrate())

    return this
  }

  _hydrateElement(element: HTMLElement, index: number) {
    // NOOP
    return this
  }

  /**
   * Recall information from storage and inject it into the html
   */
  _recall() {
    if (this.childHydrators.length === 0) {
      // @ts-ignore
      const name = this.__proto__.constructor.name
      logger.add(`_recall() not implemented in hydrator "${name}"`).warn()
    }

    this.childHydrators.map(hydrator => hydrator._recall())

    return this
  }
}
