import { VariableTypes, VariableType } from "@december/utils/src/typing/types"
import { TraitClassification } from "../parser"

/**
 * Value: String x Input x Selection List
 *        "    "   [   ]   %            %
 *
 * I'm assuming that EVERYTHING can be a combination of strings (primitives actually), input and selection list
 * But I really dont want to deal with implementing this schema
 * So i'll just attribute a symbol for "lazy value", indicating that that tag WAS parsed (but will only yield a value at runtime)
 */

export type TagDefinition = {
  type: TagType | `unknown`
  applies_to: TraitClassification
  mode?: boolean
  math?: boolean
  flag?: boolean
  lazy?: boolean
}

/**
 * SPECIALS
 *
 * dr = [number, number]_suffixed = [number, number]string
 */
export const TAG_TYPES = [`string`, `string[]`, `number`, `number[]`, `progression`, `boolean`, `range`, `number_suffixed`, `dr`] as const
export type TagType = (typeof TAG_TYPES)[number]

export const TAG_NAMES = [
  `acc`,
  `addmode`,
  `addmods`,
  `adds`,
  `age`,

  `appearance`,
  `armordivisor`,

  `basecost`,

  `basedon`,
  `basedr`,
  `basevalue`,
  `baseweight`,
  `blockat`,
  `bodytype`,
  `break`,
  `bulk`,
  `calcrange`,
  `castingcost`,
  `cat`,
  `charheight`,
  `charminst`,
  `charweight`,
  `childof`,
  `childprofile`,
  `class`,
  `conditional`,
  `cost`,
  `count`,
  `countasneed`,
  `countcapacity`,

  `creates`,
  `crushingdr`,
  `cuttingdr`,
  `damage`,
  `damagebasedon`,
  `damageistext`,
  `damtype`,
  `db`,
  `default`,

  `defaultX`,
  `description`,
  `disadat`,
  `display`,
  `displaycost`,
  `displayname`,
  `displaynameformula`,
  `displayweight`,
  `dmg`,
  `dodge`,
  `don`,
  `down`,
  `downto`,
  `dr`,
  `drnotes`,
  `duration`,
  `dx`,

  `features`,
  `fencingweapon`,
  `forceformula`,
  `formula`,
  `fuse`,

  `gives`,
  `group`,
  `hide`,

  `hides`,

  `hp`,
  `ht`,
  `ident`,
  `impalingdr`,
  `init`,
  `initmods`,
  `inplaymult`,
  `iq`,
  `isparent`,
  `itemnotes`,
  `itemswanted`,
  `lc`,
  `level`,
  `levelnames`,
  `links`,

  `location`,
  `locks`,
  `lockstep`,
  `magery`,
  `mainwin`,
  `malf`,
  `maxdam`,
  `maxscore`,

  `mergetags`,
  `minscore`,
  `minst`,
  `minstbasedon`,
  `mitigator`,
  `mode`,

  `mods`,
  `move`,

  `name`,
  `nameext`,
  `ndl`,
  `needs`,
  `newlocation`,
  `newmode`,
  `noresync`,
  `notes`,

  `optspec`,
  `owns`,

  `page`,
  `parentof`,
  `parry`,
  `parryat`,

  `per`,

  `piercingdr`,
  `pointswanted`,

  `prereqcount`,
  `race`,
  `radius`,
  `rangehalfdam`,
  `rangemax`,

  `rcl`,
  `reach`,
  `reachbasedon`,

  `replacetags`,
  `rof`,
  `round`,

  `selectX`,
  `sets`,

  `shortcat`,
  `shortname`,
  `shots`,
  `size`,
  `skills`,
  `skillused`,
  `sm`,
  `speed`,
  `st`,
  `step`,
  `subsfor`,
  `symbol`,

  `taboo`,

  `tagwith`,
  `targetlistincludes`,
  `techlvl`,

  `time`,
  `tl`,
  `traits`,
  `type`,
  `units`,
  `up`,
  `upto`,
  `usernotes`,
  `uses`,
  `uses_sections`,
  `uses_settings`,
  `vars`,
  `weaponst`,
  `weight`,
  `weightcapacity`,
  `will`,
  `x`,
] as const

export type TagName = (typeof TAG_NAMES)[number]

/**
 * NewMode() is the only tag allowed to be used more than once per trait definition.
 */
export const TAGS = {
  acc: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true }, // X+Y
  addmode: { type: `unknown`, applies_to: `modifiers_that_add_new_damage_modes`, pipe: `list` },
  addmods: { type: `unknown`, applies_to: `traits` },
  adds: { type: `unknown`, applies_to: `traits` },
  age: { type: `number`, applies_to: `templates` },

  appearance: { type: `string`, applies_to: `templates` },
  armordivisor: { type: `number`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },

  basecost: { type: `number`, applies_to: `equipment`, lazy: true },

  basedon: { type: `string`, applies_to: `any` }, // I imagine this to be a reference to a trait
  basedr: { type: `dr`, applies_to: `any` },
  basevalue: { type: `number`, applies_to: `attributes`, math: true, lazy: true },
  baseweight: { type: `number`, applies_to: `equipment`, lazy: true },
  blockat: { type: `number`, applies_to: `traits`, math: true, lazy: true },
  bodytype: { type: `string`, applies_to: `templates` },
  break: { type: `number`, applies_to: `traits_with_damage_modes`, mode: true },
  bulk: { type: `number`, applies_to: `any`, lazy: true },
  calcrange: { type: `boolean`, applies_to: `any`, flag: true },
  castingcost: { type: `unknown`, applies_to: `any`, lazy: true },
  cat: { type: `string[]`, applies_to: `traits`, lazy: true }, // does not allow for commas or braces
  charheight: { type: `string`, applies_to: `templates` },
  charminst: { type: `number`, applies_to: `any` },
  charweight: { type: `string`, applies_to: `templates` },
  childof: { type: `unknown`, applies_to: `traits` },
  childprofile: { type: `string`, applies_to: `parent_traits` }, // 1 = alternative attack
  class: { type: `unknown`, applies_to: `any` },
  conditional: { type: `unknown`, applies_to: `traits_and_modifiers` }, // apply conditional bonuses, something with a message showing in gca when it applies
  cost: { type: `progression`, applies_to: `advantages_perks_disadvantages_quirks_templates_modifiers`, lazy: true }, // cost OR cost progression (split by \)
  count: { type: `number`, applies_to: `equipment` },
  countasneed: { type: `string`, applies_to: `traits` }, // ????
  countcapacity: { type: `unknown`, applies_to: `any` },

  creates: { type: `unknown`, applies_to: `traits` }, // creates new traits
  crushingdr: { type: `dr`, applies_to: `any` },
  cuttingdr: { type: `dr`, applies_to: `any` },
  damage: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true, math: true }, // generally written as a standard gurps damage code
  damagebasedon: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true },
  damageistext: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true, flag: true }, // check wtf this does
  damtype: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true },
  db: { type: `dr`, applies_to: `traits` },
  default: { type: `number`, applies_to: `skills_and_spells`, math: true, lazy: true }, // math enabled but in a more restricted fashion than normal

  defaultX: { type: `number`, applies_to: `any`, math: true, lazy: true },
  description: { type: `string`, applies_to: `traits_and_modifiers`, lazy: true }, // sometimes can be a colon string (mostly equipment I gather)
  disadat: { type: `unknown`, applies_to: `any` },
  display: { type: `boolean`, applies_to: `attributes` }, // only accepts no as a value
  displaycost: { type: `string`, applies_to: `advantages_perks_disadvantages_quirks_templates_modifiers` },
  displayname: { type: `string`, applies_to: `any` },
  displaynameformula: { type: `string`, applies_to: `any`, lazy: true },
  displayweight: { type: `string`, applies_to: `any` },
  dmg: { type: `unknown`, applies_to: `any` },
  dodge: { type: `unknown`, applies_to: `any` },
  don: { type: `unknown`, applies_to: `any` },
  down: { type: `progression`, applies_to: `attributes` }, // cost OR cost progression (split by \)
  downto: { type: `number_suffixed`, applies_to: `traits_other_than_equipment`, math: true }, // <value> or <value>[pts], minimum level allowed for the trait
  dr: { type: `dr`, applies_to: `traits`, lazy: true },
  drnotes: { type: `unknown`, applies_to: `any` },
  duration: { type: `unknown`, applies_to: `any` },
  dx: { type: `number`, applies_to: `any` },

  features: { type: `unknown`, applies_to: `any` },
  fencingweapon: { type: `unknown`, applies_to: `any` },
  forceformula: { type: `boolean`, applies_to: `modifiers`, flag: true },
  formula: { type: `unknown`, applies_to: `advantages_perks_disadvantages_quirks_templates_modifiers` }, // trait cost

  gives: { type: `unknown`, applies_to: `traits_and_modifiers` }, // super complex
  group: { type: `string[]`, applies_to: `traits_and_modifiers` }, // includes trait in a group WITHOUT having to adjusts groups listing in data file, CAN be a list of group names split by comma
  hide: { type: `boolean`, applies_to: `any` },

  hides: { type: `unknown`, applies_to: `templates`, flag: true },

  hp: { type: `number`, applies_to: `any` },
  ht: { type: `number`, applies_to: `any` },
  ident: { type: `unknown`, applies_to: `traits` }, // in conjunction with countasneed
  impalingdr: { type: `unknown`, applies_to: `any` },
  init: { type: `number`, applies_to: `advantages_perks_disadvantages_quirks_templates_modifiers`, lazy: true }, // initial trait level when added
  initmods: { type: `unknown`, applies_to: `traits_and_modifiers`, pipe: `list` },
  inplaymult: { type: `boolean`, applies_to: `attributes`, flag: true },
  iq: { type: `number`, applies_to: `any` },
  isparent: { type: `boolean`, applies_to: `any` },
  itemnotes: { type: `unknown`, applies_to: `any` },
  itemswanted: { type: `unknown`, applies_to: `any` },
  lc: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true },
  level: { type: `number`, applies_to: `modifiers` },
  levelnames: { type: `string[]`, applies_to: `advantages_perks_disadvantages_quirks_templates_modifiers`, lazy: true }, // zero level must be the first AND enclosed by brackets
  links: { type: `unknown`, applies_to: `any` },

  location: { type: `unknown`, applies_to: `any` },
  locks: { type: `boolean`, applies_to: `templates`, flag: true },
  lockstep: { type: `boolean`, applies_to: `templates`, flag: true },
  magery: { type: `unknown`, applies_to: `any` },
  mainwin: { type: `number`, applies_to: `attributes` },
  malf: { type: `unknown`, applies_to: `any` }, // check malfunction rules
  maxdam: { type: `unknown`, applies_to: `traits_with_damage_modes` },
  maxscore: { type: `unknown`, applies_to: `attributes`, math: true },

  mergetags: { type: `unknown`, applies_to: `traits` }, // insert tags to existing trait
  minscore: { type: `unknown`, applies_to: `attributes`, math: true },
  minst: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },
  minstbasedon: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true },
  mitigator: { type: `unknown`, applies_to: `modifiers` },
  mode: { type: `string`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },

  mods: { type: `unknown`, applies_to: `traits_and_modifiers` },
  move: { type: `number`, applies_to: `any` },

  name: { type: `string`, applies_to: `traits_and_modifiers`, lazy: true },
  nameext: { type: `string`, applies_to: `traits_and_modifiers`, lazy: true },
  ndl: { type: `unknown`, applies_to: `any` },
  needs: { type: `unknown`, applies_to: `traits`, math: true, pipe: `or` },
  newlocation: { type: `unknown`, applies_to: `any` },
  newmode: { type: `unknown`, applies_to: `traits` },
  noresync: { type: `boolean`, applies_to: `any` },
  notes: { type: `string`, applies_to: `traits`, lazy: true },

  optspec: { type: `boolean`, applies_to: `skills_and_spells` }, // only 1 is a valid value in GCA
  owns: { type: `unknown`, applies_to: `templates`, flag: true },

  page: { type: `unknown`, applies_to: `any` },
  parentof: { type: `unknown`, applies_to: `traits` },
  parry: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },
  parryat: { type: `unknown`, applies_to: `traits`, math: true },

  per: { type: `number`, applies_to: `any` },

  piercingdr: { type: `dr`, applies_to: `any` },
  pointswanted: { type: `unknown`, applies_to: `any` },

  prereqcount: { type: `unknown`, applies_to: `any` },
  race: { type: `string`, applies_to: `templates` },
  radius: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, mode: true },
  rangehalfdam: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },
  rangemax: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },

  rcl: { type: `number`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },
  reach: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true },
  reachbasedon: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true },

  replacetags: { type: `unknown`, applies_to: `traits` },
  rof: { type: `unknown`, applies_to: `traits_with_damage_modes`, mode: true, lazy: true },
  round: { type: `number`, applies_to: `attributes`, math: true }, // <0 -> floor, >0 -> ceil

  selectX: { type: `unknown`, applies_to: `traits` }, // there is a difference between #choice/#choicelist and SelectX(), I just don’t know what it is
  sets: { type: `unknown`, applies_to: `templates` }, // it just reproduces user manual behavior, so it applies all point costs deductions

  shortcat: { type: `string[]`, applies_to: `any`, lazy: true },
  shortname: { type: `string`, applies_to: `modifiers`, mode: true },
  shots: { type: `number_suffixed`, applies_to: `traits_with_damage_modes`, lazy: true }, // numeric value with simple suffix
  size: { type: `unknown`, applies_to: `any` },
  skills: { type: `unknown`, applies_to: `any` },
  skillused: { type: `string[]`, applies_to: `traits`, mode: true, lazy: true }, // list of skills (with modifier if needed)
  sm: { type: `number`, applies_to: `any` },
  speed: { type: `number`, applies_to: `any` },
  st: { type: `number`, applies_to: `any` },
  step: { type: `number`, applies_to: `attributes`, math: true },
  subsfor: { type: `unknown`, applies_to: `any` },
  symbol: { type: `string`, applies_to: `attributes` }, // doenst accept restricted characters

  taboo: { type: `unknown`, applies_to: `traits` },

  tagwith: { type: `unknown`, applies_to: `any` },
  targetlistincludes: { type: `unknown`, applies_to: `any` },
  techlvl: { type: `unknown`, applies_to: `equipment` },

  time: { type: `unknown`, applies_to: `any` },
  tl: { type: `range`, applies_to: `traits`, lazy: true }, // simple numeric value or range
  traits: { type: `unknown`, applies_to: `any` },
  type: { type: `string`, applies_to: `skills_and_spells`, lazy: true }, // usually not used for skills
  units: { type: `unknown`, applies_to: `any` },
  up: { type: `progression`, applies_to: `attributes` },
  upto: { type: `number_suffixed`, applies_to: `traits`, math: true },
  usernotes: { type: `string`, applies_to: `any` },
  uses: { type: `unknown`, applies_to: `any` },
  uses_sections: { type: `unknown`, applies_to: `any` },
  uses_settings: { type: `unknown`, applies_to: `any` },
  vars: { type: `unknown`, applies_to: `any` },
  weaponst: { type: `unknown`, applies_to: `any` },
  weight: { type: `number_suffixed`, applies_to: `any` },
  weightcapacity: { type: `number_suffixed`, applies_to: `any` },
  will: { type: `number`, applies_to: `any` },
  x: { type: `unknown`, applies_to: `any` },

  fuse: { type: `unknown`, applies_to: `any` },
} as Record<TagName, TagDefinition>

export const TAG_NAME_EQUIVALENCY = {
  conditonal: `conditional`,
  countasneeds: `countasneed`,
  //
  descrition: `description`,
  dispaycost: `displaycost`,
  default0: `defaultX`,
  default1: `defaultX`,
  default2: `defaultX`,
  default3: `defaultX`,
  default4: `defaultX`,
  default5: `defaultX`,
  default6: `defaultX`,
  default7: `defaultX`,
  default8: `defaultX`,
  default9: `defaultX`,
  //
  locations: `location`,
  //
  note: `notes`,
  //
  select0: `selectX`,
  select1: `selectX`,
  select2: `selectX`,
  select3: `selectX`,
  select4: `selectX`,
  select5: `selectX`,
  select6: `selectX`,
  select7: `selectX`,
  select8: `selectX`,
  select9: `selectX`,
  //
  tagswith: `tagwith`,
} as Record<string, TagName>
