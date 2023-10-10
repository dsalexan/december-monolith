export default class GurpsMobileActor extends GURPS.GurpsActor {
  forceRenderAfterSheetImport: boolean = false

  // @ts-ignore
  render(force = false, context = {}, userId: string) {
    for (const app of Object.values(this.apps)) {
      // @ts-ignore
      app.render(force, context, userId)
    }
  }
}
