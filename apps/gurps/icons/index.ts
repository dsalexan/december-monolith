import { MOVE_DISPLAY } from "../src/move"

import Moves from "./moves"
import Maneuvers from "./maneuvers"
import Defenses from "./defenses"

// define base index of icons
const base = {
  ...Moves,
  ...Maneuvers,
  ...Defenses,
} as Record<string, string>

// prepare alternative keys for icons
const alternatives = {
  attributes: `attribute`,
  // map move display to move (apparently there are places using "move_x1/3"???)
  ...Object.fromEntries(Object.entries(MOVE_DISPLAY).map(([key, value]) => [`move_${value}`, key])),
}

// inject alternative index into base
const composite = Object.assign({}, base)
for (let [key, alt] of Object.entries(alternatives)) {
  composite[key] = base[alt]
}

// replace "_" with "-" in keys (cnormand gurps use "-")
const keysWith_ = Object.keys(composite)
for (let key of keysWith_) {
  composite[key.replace(/_/gi, `-`)] = base[key]
}

export default composite
