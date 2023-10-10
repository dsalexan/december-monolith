import { MOVE_DISPLAY } from "../src/move"

import Moves from "./moves"
import Maneuvers from "./maneuvers"
import Defenses from "./defenses"

// define base index of icons
const base = {
  // sources
  gca: `mdi-bookshelf`,
  no_gca: `no-bookshelf`,
  no_gca_small: `no-bookshelf-small`,
  //
  hit_location: `body-scan-fill`,
  attribute: `mdi-account`,
  advantage: `mdi-arrow-up-thick`, // options
  disadvantage: `mdi-arrow-down-thick`, // options
  skill: `mdi-hexagon-multiple`,
  untrained_skill: `mdi-hexagon-multiple-outline`,
  spell: `spell`,
  equipment: `mdi-bag-personal`,
  hp: `mdi-heart`,
  fp: `mdi-lightning-bolt`,
  reeling: `heart-down`,
  tired: `lightning-bolt-down`,
  //
  reaction: `mdi-thumb-up`,
  reaction_negative: `mdi-thumb-down`,
  //
  ranged: `mdi-bow-arrow`,
  melee: `mdi-sword-cross`,
  // basic
  to_hit: `3d6`,
  damage: `critical-strike`,
  coin: `profit`,
  //
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
