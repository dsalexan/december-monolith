import { isNil, startCase } from "lodash"

import Hydrator from "../hydrator"

// @ts-ignore
import autoComplete from "@tarekraafat/autocomplete.js"
import { isNilOrEmpty } from "@december/utils"

export type AutocompleteHydratorProperties = {
  storageKey: string
}

export default class AutocompleteHydrator extends Hydrator<AutocompleteHydratorProperties> {
  get STORAGE() {
    return {
      // EXPANDED: `${this.properties.storageKey}.expanded`,
    }
  }

  autocompleteObjecets: Record<string, any> = {}

  _attach(html: JQuery<HTMLElement>) {
    const input = this._find(html, `> input[type="search"].autocomplete`)

    return super._attach(input)
  }

  _persist() {
    // this.on(`select`, ({ data }) => this.manager.storage.set(this.__selected_tab, data))

    return super._persist()
  }

  _hydrateElement(element: HTMLElement, index: number) {
    const self = this
    const name = element.getAttribute(`name`)!

    // ERROR: needs name
    if (!name) debugger

    const cardList = $(element).parent().find(` > .card-list`)
    cardList.find(` > .body`).remove()

    $(element).on(`input`, function (event) {
      // @ts-ignore
      const text = event.target.value
      const hasText = text?.length >= object.threshold
      $(element).toggleClass(`has-text`, hasText)
    })

    const object = new autoComplete({
      selector: () => element,
      placeHolder: `${startCase(name)} name...`,
      threshold: 3,
      searchEngine: `loose`,
      wrapper: false,
      data: {
        src: async function () {
          try {
            element.setAttribute(`placeholder`, `Loading...`)

            const source = await fetch(`https://tarekraafat.github.io/autoComplete.js/demo/db/generic.json`)
            const data = await source.json()

            element.setAttribute(`placeholder`, object.placeHolder)

            return data
          } catch (error) {
            return error
          }
        },
        cache: true,
        keys: [`name`, `food`, `cities`, `animals`],
        // filter: list => {
        //   debugger
        //   return list
        // },
      },
      events: {
        input: {
          focus: () => {
            if (object.input.value.length) object.start()
          },
        },
      },
      //
      resultsList: {
        tag: `div`,
        class: `body results`,
        destination: () => cardList[0],
        position: `beforeend`,
        element: (list, data) => {
          if (!data.results.length) {
            // Create "No Results" message element
            const message = document.createElement(`div`)
            // Add class to the created element
            message.setAttribute(`class`, `no_result`)
            // Add message text content
            message.innerHTML = `<span>Found No Results for "<b>${data.query}</b>"</span>`
            // Append message element to the results list
            list.prepend(message)
          }
          //  else {
          //   const html = Handlebars.partials[`components/cards/list`]({ label: `Results` })
          //   const node = $(html)

          //   list.innerHTML = ``
          //   list.appendChild(node[0])
          // }
        },
        noResults: true,
        maxResults: 20,
        tabSelect: true,
      },
      resultItem: {
        tag: `div`,
        class: `card-group`,
        element: (item, data) => {
          const html = Handlebars.partials[`components/cards/wrapper`]()
          const node = $(html)

          item.innerHTML = ``

          const children = $(`<div class="children"></div>`)
          item.appendChild(children[0])

          children[0].appendChild(node[0])

          // // Modify Results Item Style
          // item.style = `display: flex; justify-content: space-between;`
          // // Modify Results Item Content
          // item.innerHTML = `
          // <span style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
          //   ${data.match}
          // </span>
          // <span style="display: flex; align-items: center; font-size: 13px; font-weight: 100; text-transform: uppercase; color: rgba(0,0,0,.2);">
          //   ${data.key}
          // </span>`
        },
        // highlight: true,
      },

      // config: {
      //   selector: `#autoComplete`,
      //   placeHolder: `Search for Food...`,
      //   data: {
      //     src: [`Sauce - Thousand Island`, `Wild Boar - Tenderloin`, `Goat - Whole Cut`],
      //     cache: true,
      //   },
      //   resultItem: {
      //     highlight: true,
      //   },
      // },
    })

    this.autocompleteObjecets[name] = object

    return super._hydrateElement(element, index)
  }

  _recall() {
    // set selected tab (forced to render what is missing)
    // const selectedTab = this.manager.storage.get<string>(this.__selected_tab, this.properties.defaultTab)
    // if (!isNil(selectedTab)) this.select(selectedTab, true)

    return super._recall()
  }

  // API
}
