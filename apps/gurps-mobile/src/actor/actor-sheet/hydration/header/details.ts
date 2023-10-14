import SheetHydrator from "../hydrator"

export default class HeaderDetails extends SheetHydrator {
  _attach(html: JQuery<HTMLElement>) {
    const details = this._find(html, `> .details`)

    return super._attach(details)
  }

  _hydrate() {
    const self = this

    const details = this.html
    const controls = details.find(`> .controls`)

    // wire events
    controls.find(`> .close`).on(`click`, () => DECEMBER.closeWindow())
    controls.find(`> .full`).on(`click`, () => this.sheet.openDesktopSheet())

    return super._hydrate()
  }

  // API
  clickControl(name: string) {}
}
