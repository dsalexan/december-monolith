import type { Translations } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/apps/i18n"
import { get } from "lodash"

const I = (module_id: string, key: string) => game.i18n.localize(`${module_id}.${key}`)

export function i18n(key: string) {
  return get(game.i18n, key) as string | Translations
}

export default I
