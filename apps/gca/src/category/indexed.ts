export default class IndexedCategory {
  name: string
  nameext: string
  count: number

  _row: number

  get fullname() {
    return this.nameext === `` || this.nameext === undefined ? this.name : `${this.name} (${this.nameext})`
  }

  constructor() {
    this.name = ``
    this.nameext = ``
    this.count = 0

    this._row = -1
  }

  static General(line: string[], index: number) {
    const category = new IndexedCategory()

    category.name = line[0].trim().replaceAll(/[\s]+/g, ` `).trim()
    category.nameext = line[1].trim().replaceAll(/[\s]+/g, ` `).trim()
    category.count = parseInt(line[2].trim())

    category._row = index

    return category
  }
}
