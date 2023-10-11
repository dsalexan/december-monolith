import SheetHydrator from "../hydrator"

export default class HeaderDetails extends SheetHydrator {
  hydrate(html: JQuery<HTMLElement>): void {
    const details = this._find(html, `> .details`)

    super.hydrate(details)
  }

  _hydrate(): void {
    const self = this

    const details = this.html
    const controls = details.find(`> .controls`)

    // wire events
    controls.find(`> .close`).on(`click`, () => DECEMBER.closeWindow())
    controls.find(`> .full`).on(`click`, () => this.sheet.openDesktopSheet())
  }

  clickControl(name: string) {}
}
