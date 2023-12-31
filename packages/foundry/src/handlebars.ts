import { get, intersection, isArray, isEmpty, isNil, isObjectLike, isString, range } from "lodash-es"

export class TemplatePreloader {
  /**
   * Preload a set of templates to compile and cache them for fast access during rendering
   */
  static preloadHandlebarsTemplates(paths: string[]) {
    // const paths = [`__WEBPACK__ALL_TEMPLATES__`]
    const templatePaths = paths.filter(path => !path.includes(`partials`))
    const partialPaths = paths.filter(path => path.includes(`partials`))

    partialPaths.forEach(filename => {
      const name = filename.substr(filename.indexOf(`partials`) + `partials`.length + 1).replace(/(.*)\.hbs/, `$1`)
      fetch(filename)
        .then(content => content.text())
        .then(text => {
          Handlebars.registerPartial(name, text)
        })
    })

    return loadTemplates(templatePaths)
  }

  /**
   * Preload generic handlebars helpers
   */
  static preloadHandlebarsHelpers() {
    // #region LOGGING

    Handlebars.registerHelper(`info`, function (...args) {
      console.log(...args)
    })

    Handlebars.registerHelper(`group`, function (collapsed, message, ...styles) {
      if (collapsed) console.groupCollapsed(message, ...styles.slice(0, -1))
      else console.group(message, ...styles.slice(0, -1))
    })

    Handlebars.registerHelper(`groupend`, function () {
      console.groupEnd()
    })

    // #endregion

    // #region STYLING

    // #endregion

    Handlebars.registerHelper(`prop`, ({ hash }: { hash: { name: string; value: string } }) => {
      const { name, value } = hash
      if (value === undefined) return ``
      return `${name}="${value}"`
    })

    Handlebars.registerHelper(`for`, function (from, to, incr, block) {
      let accum = ``
      for (let i = from; i < to; i += incr) accum += block.fn(i)
      return accum
    })

    Handlebars.registerHelper(`some`, function (array: any[], value, ifTrue, ifFalse = ``) {
      if (ifFalse.name === `some`) ifFalse = ``
      if (isNil(array)) return ifFalse
      return array.some(item => item === value) ? ifTrue : ifFalse
    })

    Handlebars.registerHelper(`equals`, function (a, b, c) {
      if (isArray(b) ? b?.includes(a) : a === b) return c
      return ``
    })

    Handlebars.registerHelper(`contains`, function (list, a, c) {
      const a_list = isArray(a) ? a : [a]
      if (intersection(list as any[], a_list).length > 0) return c
      return ``
    })

    Handlebars.registerHelper(`get`, function (object, path, defaultValue) {
      // @ts-ignore
      const _default = { array: [], object: {} }[defaultValue] ?? defaultValue
      return get(object, path, _default)
    })

    Handlebars.registerHelper(`keys`, a => Object.keys(a))

    Handlebars.registerHelper(`isTrue`, (a, b) => (a ? b : ``))
    Handlebars.registerHelper(`isArray`, a => isArray(a))
    Handlebars.registerHelper(`nullishCoalescing`, (a, b = ``) => {
      if (b.name === `nullishCoalescing`) return a ?? ``
      return a ?? b
    })

    Handlebars.registerHelper(`percentage`, (value, max) => (value / max) * 100)
    Handlebars.registerHelper(`join`, array => (array === undefined ? `` : array.join(` `)))
    Handlebars.registerHelper(`slice`, (array, a, b) => (isArray(array) ? array.slice(a, b) : array))

    Handlebars.registerHelper(`isEqual`, (a, b) => a === b)
    Handlebars.registerHelper(`isString`, a => isString(a))
    Handlebars.registerHelper(`isObjectLike`, a => isObjectLike(a))
    Handlebars.registerHelper(`isArray`, a => isArray(a))

    Handlebars.registerHelper(`isNil`, function (a, b, c = ``) {
      if (c.name === `isNil`) return isNil(a) ? b : ``
      return isNil(a) ? b : c
    })
    Handlebars.registerHelper(`isNilOrEmpty`, function (a, b, c = ``) {
      if (c.name === `isNilOrEmpty`) c = ``
      return isNil(a) || isEmpty(a) || (isArray(a) && a.length === 0) ? b : c
    })

    Handlebars.registerHelper(`sum`, (a, b) => a + b)

    Handlebars.registerHelper(`range`, (a, b) => range(a, b))
  }
}
