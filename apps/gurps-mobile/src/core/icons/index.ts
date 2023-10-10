import custom from "./custom.json"

type SVGDefinition = {
  name: string
  viewbox: string
  svg: string
}

export default class IconsManager {
  private static instance: IconsManager

  private _index: Record<string, string> = {}

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {
    this._index = {}

    // this.fetch(path.join(__dirname, `./custom.json`))
    this.index(custom)
  }

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(): IconsManager {
    if (!IconsManager.instance) {
      IconsManager.instance = new IconsManager()
    }

    return IconsManager.instance
  }

  private fetch(path: string) {
    // ERROR: fetch not implemented in webpack (fs and path are nodejs modules)
    debugger

    // read json from path
    // const content = fs.readFileSync(path, `utf8`)
    // const json = JSON.parse(content) as Record<string, SVGDefinition>
  }

  private index(json: Record<string, SVGDefinition>) {
    // insert json entries into _index (as a svg html string)
    const keys = Object.keys(json)
    for (const key of keys) {
      const svg = json[key]

      const viewbox = svg.viewbox ? `viewBox="${svg.viewbox}"` : ``

      if (this._index[key] !== undefined) debugger // duplicate key
      this._index[key] = `<svg class="icon custom" fill="currentColor" ${viewbox}>${svg.svg}</svg>`
    }
  }

  /** Returns the svg html node (as a string) for a specific icon */
  public get(name: string) {
    return this._index[name]
  }

  /** Returns the svg html node (as a string) for a specific icon */
  public static get(name: string) {
    return IconsManager.getInstance().get(name)
  }
}
