import * as Foundry from "@december/foundry"

import GURPSIcons from "@december/gurps/../icons"
import IconsManager from "./icons"
// import * as CustomIcons from "../assets/icons"

// Through here we register handlebars helpers and snippets SPECIFIC to the module

export class TemplatePreloader {
  static preloadHandlebarsTemplates() {
    Foundry.Handlebars.TemplatePreloader.preloadHandlebarsTemplates(TEMPLATES)
  }

  static preloadHandlebarsHelpers() {
    Foundry.Handlebars.TemplatePreloader.preloadHandlebarsHelpers()

    Handlebars.registerHelper(`isCustomIcon`, value => !!IconsManager.get(value))

    Handlebars.registerHelper(`customIcon`, function (value: string) {
      // if icon is custom, get custom icon from manager (will search in one of the pre-compiled jsons) and send it
      const icon = IconsManager.get(value)
      if (icon) return new Handlebars.SafeString(icon)

      // if no icon was found, send a string informing as html
      return `<div>custom icon "${value}" not found</div>`
    })

    Handlebars.registerHelper(`gurpsIcon`, function (value: string) {
      // no-op
      if (!value) return ``

      // if value is MDI (which means it is not a gurps icon), default to sending a mdi icon
      if (value.includes(`mdi-`)) return new Handlebars.SafeString(`<i class="icon mdi ${value}"></i>`)

      // get icon name from value (in a gurps context)
      const icon = GURPSIcons[value] as string

      // if icon is mdi, send a mdi icon
      if (icon?.includes(`mdi-`)) return new Handlebars.SafeString(`<i class="icon mdi ${icon}"></i>`)

      const _icon = icon ?? value
      // if icon is custom, get custom icon from manager (will search in one of the pre-compiled jsons) and send it
      const node = IconsManager.get(_icon)
      if (node) return new Handlebars.SafeString(node)

      // if no icon was found, send a string informing as html
      return `<div>${!value ? `custom` : `gurps`} icon "${_icon ? _icon : value}" not found</div>`
    })

    Handlebars.registerHelper(`gurpsLabel`, function (value: string) {
      return HandlebarsHelpers.localize(GURPS.Maneuvers.get(value)?.label ?? `unknown`, {} as HandlebarsHelpers.LocalizeOptions)
    })
  }
}
