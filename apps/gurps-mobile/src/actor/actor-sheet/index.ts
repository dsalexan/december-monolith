/* eslint-disable no-debugger */
import loggerFactory, { MARKER_BLACK, MARKER_GREEN, MARKER_YELLOW, paint } from "../../logger"
import { MODULE_ID } from "../../../config"
import GurpsMobileActor from "../actor"
import { SheetHTMLHydrationManager } from "./hydration"

const logger_ = loggerFactory.child(`actor-sheet`, `silly`)

export interface Options extends ActorSheet.Options {
  noContext: boolean
}

export interface Data extends ActorSheet.Data<Options> {}

const SHEET_NAME = `MobileGurpsActorSheet`

export class GurpsMobileActorSheet extends GURPS.GurpsActorSheet {
  static sheet_name = `MobileGurpsActorSheet`
  hydration: SheetHTMLHydrationManager

  constructor(data: any, context: any) {
    super(data, context)

    this.hydration = new SheetHTMLHydrationManager(this)
  }

  // #region LOCAL STORAGE
  getLocalStorage<T>(key: string, defaultValue: T) {
    const _key = `${MODULE_ID}.${this.actor.uuid}.${SHEET_NAME}.${key}`
    const value = window.localStorage.getItem(_key)
    return value === null ? defaultValue : (JSON.parse(value) as T)
  }

  setLocalStorage<T>(key: string, value: T) {
    const _key = `${MODULE_ID}.${this.actor.uuid}.${SHEET_NAME}.${key}`
    window.localStorage.setItem(_key, JSON.stringify(value))
  }

  removeLocalStorage(key: string) {
    const _key = `${MODULE_ID}.${this.actor.uuid}.${SHEET_NAME}.${key}`
    window.localStorage.removeItem(_key)
  }
  // #endregion

  // #region FOUNDRY OVERRIDES

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [`mobile`, `gurps-mobile`, `sheet`, `actor`],
      resizable: true,
      width: `100vw`,
      height: `100vh`,
      // tabs: [{ navSelector: `.gurps-sheet-tabs`, contentSelector: `.sheet-body`, initial: `description` }],
      // scrollY: [`.gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipmentcarried #equipmentother #notes`],
      // dragDrop: [{ dragSelector: `.item-list .item`, dropSelector: null }],
    })
  }

  /** @override */
  get template() {
    return `modules/${MODULE_ID}/templates/sheets/mobile-actor-sheet.hbs`
  }

  // @ts-ignore
  get actor() {
    return this.object as any as GurpsMobileActor
  }

  /** @override */
  _forceRender() {
    return
  }

  // #endregion

  // #region GURPS

  openDesktopSheet() {
    this.actor.openSheet(`gurps.GurpsActorSheet`)
  }

  // #endregion

  async skipRender(...promises: Promise<unknown>[]) {
    debugger
    // return await new Promise<void>(resolve => {
    //   this.actor.ignoreRender = true
    //   this.actor.skipRenderOnCalculateDerivedValues = true

    //   Promise.all(promises).then(() => {
    //     console.log(`Render-skipping promises runned`, this.actor.ignoreRender)
    //     Hooks.once(`postRenderMobileGurpsActorSheet`, (...args) => {
    //       // console.log(`unflag IGNORE RENDER`)
    //       this.actor.ignoreRender = false
    //       resolve()
    //     })
    //   })
    // })
  }

  activateListeners(inner: JQuery<HTMLElement>) {
    // called inside _render, using innerHtml as argument
    //    const data = await this.getData(this.options);
    //    inner = await this._renderInner(data);

    logger_
      .add(paint.bold(`[${this.actor.id}]`))
      .p.add(`activateListeners`)
      .p.add(inner)
      .info()

    this.hydration.activateListeners(inner)
  }

  _applyState(inner: JQuery<HTMLElement>) {
    const logger = logger_
      .add(paint.bold(`[${this.actor.id}]`))
      .p.clone(true)
      .timer(`_updateHtml`)

    /**
     * Apply state to a recenlty rendered html (to keep the sheet as it was before re-rendering)
     */

    logger.add(paint.white.bgRed(` _applyState `)).p.add(inner).info()
  }

  async _render(force = false, context: any = {}) {
    /**
     * I'm overriding this method to have a beter control of when to re-render the sheet vs when to just update some sections
     */

    const logger = logger_
      .add(paint.bold(`[${this.actor.id}]`))
      .p.clone(true)
      .timer(`_render`)

    const origin = context?.userId
    // @ts-ignore
    const html = this.element.find(`.window-content`).children(0)

    const IGNORE_RENDER_CONTEXTS = [`createActiveEffect`, `updateActiveEffect`, `deleteActiveEffect`]

    // state
    const sheetWasReimported = this.actor.forceRenderAfterSheetImport
    if (sheetWasReimported) force = true

    const unknownOrigin = origin === undefined
    const internalOrigin = origin === game.userId
    const externalOrigin = origin !== game.userId && !unknownOrigin

    const action = context?.action ?? (context?.renderContext !== undefined ? `context` : `unknown`)
    // const datachanges = new Datachanges(context?.data)

    // ignores
    const ignoreUnknownEmpty = action === `unknown`
    const ignoreUpdate = action === `update`
    const ignoreRenderContext = IGNORE_RENDER_CONTEXTS.includes(context?.renderContext)

    const ignoreRender = ignoreUnknownEmpty || ignoreUpdate || ignoreRenderContext

    if (force)
      logger
        .add(`_render`)
        .add(` (${sheetWasReimported ? `re-import` : `force`})`)
        .warn()

    logger.group(true).add(`_render`)
    if (force) logger.add(` (${sheetWasReimported ? `re-import` : `force`})`)
    if (action === `hmr`) logger.add(paint.italic.rgb(197, 25, 22, 1)(` hmr`)).info()
    else logger.add(paint.italic.rgb(197, 25, 22, context?.userId ? 1 : 0.5)(` user:${context?.userId ?? `unknown`}`)).info()

    logger.pad().table(
      [
        [`context`, context || paint.italic.opacity(0.5).web(`dimgrey`)(`undefined`)],
        [`state`, this._state || paint.italic.opacity(0.5).web(`dimgrey`)(`undefined`)],
        [`element`, this.element || paint.italic.opacity(0.5).web(`dimgrey`)(`undefined`)],
        [`_element`, this._element || paint.italic.opacity(0.5).web(`dimgrey`)(`undefined`)],
        //
        logger.BREAK_LINE,
        //
        [`unknownOrigin`, unknownOrigin || undefined],
        [`internalOrigin`, internalOrigin || undefined],
        [`externalOrigin`, externalOrigin || undefined], //
        [`action`, action],
        // [`data changes`, Object.keys(datachanges).length || undefined],
      ],
      [paint.italic.grey, paint.string],
      { skip: ([, value]) => value === undefined },
    )

    if (!force) {
      if (ignoreUnknownEmpty) logger.add(paint.bold(`(skipping)`)).add(`unknown/empty context ignored`).warn()
      if (ignoreUpdate) logger.add(paint.bold(`(skipping)`)).add(`update action is ignored`).warn()
      if (ignoreRenderContext)
        logger
          .add(paint.bold(`(skipping)`))
          .add(`render context (${context?.renderContext}) ignored`)
          .warn()
    }

    logger.group()

    // shouldRender === I want the render to be skipped
    //    there is a possibility where I dont want to skip the render (shouldRender = true), but someone above (super, super.super, etc...) could want to
    const shouldRender = force || !ignoreRender
    if (shouldRender) {
      logger
        .add(paint.bold.bgRgb(0, 191, 255, 0.3)(` super._render... `))
        .duration(`_render`)
        .info()
      await super._render(force, context)

      this._applyState(this.element.find(`.window-content`).children(0 as any))
    } else {
      logger.add(paint.bold.bgRed(` _updateHtml (unimplemented)... `)).duration(`_render`).info()
      // this._updateHtml(...)
    }

    this.actor.forceRenderAfterSheetImport = false
  }

  // async _updateHtml({ datachanges, ...context }: { datachanges: Datachanges; [key: string]: any }) {
  async _updateHtml({ ...context }: { [key: string]: any }) {
    const logger = logger_
      .add(paint.bold(`[${this.actor.id}]`))
      .p.clone(true)
      .timer(`_updateHtml`)

    /**
     * My alternative to _render
     * Instead of re-rendering the entire sheet I update only the necessary sections of html
     */

    const options = {}
    foundry.utils.mergeObject(options, this.options, { insertKeys: false })
    foundry.utils.mergeObject(options, context, { insertKeys: false })

    const element = this.element
    // @ts-ignore
    const html = element.find(`.window-content`).children(0)

    logger.group(true).add(paint.bold.white.bgRed(` _updateHtml `))
    // if (!all)
    logger.add(paint.italic.rgb(197, 25, 22, context?.userId ? 1 : 0.5)(` user:${context?.userId ?? `unknown`}`)).info()

    logger.group()
  }

  getData(options?: Partial<Options> | undefined): any {
    const logger = logger_
      .add(paint.bold(`[${this.actor.id}]`))
      .p.clone(true)
      .timer(`getData`)

    // getting data from gurps (the module, cnormand's)
    const sheetData = super.getData(options) as Data

    const ALL = !options?.noContext
    const PARTIAL = options?.noContext

    const marker = ALL ? MARKER_YELLOW : PARTIAL ? MARKER_GREEN : MARKER_BLACK

    logger.group(true).add(paint.bold.bgRgb(marker)(` getData `))
    if (options?.noContext) logger.add(paint.regular(` (No Context Generation)`))
    if (ALL) logger.add(paint.italic.bold(` all`))
    if (PARTIAL) logger.add(paint.italic.regular(` partial`))
    logger.info()

    logger.add(paint.italic.web(`dimgray`)(`options:`)).p.add(options).info()
    logger.add(paint.italic.web(`dimgray`)(`data:`)).p.add(sheetData).info()

    logger.group()

    return sheetData
  }
}
