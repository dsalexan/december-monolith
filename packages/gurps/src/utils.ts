import assert from "assert"

import { isNumeric } from "@december/utils/typing"
import { Range } from "@december/utils"

export const BOOK_REFERENCES = {
  AA: `Alphabet Arcane`,
  AALS: `Alphabet Arcane: Lost Serifs`,
  "ACT1:": `Action 1: Heroes`,
  "ACT2:": `Action 2: Exploits`,
  "ACT3:": `Action 3: Furious Fists`,
  "ACT4:": `Action 4: Specialists`,
  "ACT5:": `Action 5: Dictionary of Danger`,
  "ACT6:": `Action 6: Tricked-Out Rides`,
  "ACT7:": `Action 7: Mercenaries`,
  "ACT9:": `Action 9: The City`,
  AD: `Adaptations`,
  "ATE1:": `After the End 1: Wastelanders`,
  "ATE2:": `After the End 2: The New World`,
  AS: `Aliens: Sparrials`,
  // B: `Basic Set: Characters OR the combined Basic Set: Characters and Campaigns`,
  // B: `Basic Set`,
  B: `Basic Set: Characters`,
  BC: `Boardroom and Curia`,
  BCTR: `Boardroom and Curia: Tomorrow Rides`,
  BCW: `Steampunk Setting: The Broken Clockwork World`,
  BL: `Big Lizzie`,
  BS: `Banestorm`,
  BSA: `Banestorm: Abydos`,
  BT: `Bio-Tech`,
  BX: `Basic Set: Campaigns`,
  C: `Crusades`,
  CA: `Casey & Andy`,
  "CN1:": `Creatures of the Night, Volume 1`,
  "CN2:": `Creatures of the Night, Volume 2`,
  "CN3:": `Creatures of the Night, Volume 3`,
  "CN4:": `Creatures of the Night, Volume 4`,
  "CN5:": `Creatures of the Night, Volume 5`,
  CS: `City Stats`,
  DB: `Transhuman Space: Deep Beyond (3E)`,
  "DF1:": `Dungeon Fantasy 1: Adventurers`,
  "DF2:": `Dungeon Fantasy 2: Dungeons`,
  "DF3:": `Dungeon Fantasy 3: The Next Level`,
  "DF4:": `Dungeon Fantasy 4: Sages`,
  "DF5:": `Dungeon Fantasy 5: Allies`,
  "DF6:": `Dungeon Fantasy 6: 40 Artifacts`,
  "DF7:": `Dungeon Fantasy 7: Clerics`,
  "DF8:": `Dungeon Fantasy 8: Treasure Tables`,
  "DF9:": `Dungeon Fantasy 9: Summoners`,
  "DF10:": `Dungeon Fantasy 10: Taverns`,
  "DF11:": `Dungeon Fantasy 11: Power-Ups`,
  "DF12:": `Dungeon Fantasy 12: Ninja`,
  "DF13:": `Dungeon Fantasy 13: Loadouts`,
  "DF14:": `Dungeon Fantasy 14: Psi`,
  "DF15:": `Dungeon Fantasy 15: Henchmen`,
  "DF16:": `Dungeon Fantasy 16: Wilderness Adventures`,
  "DF17:": `Dungeon Fantasy 17: Guilds`,
  "DF18:": `Dungeon Fantasy 18: Power Items`,
  "DF19:": `Dungeon Fantasy 19: Incantation Magic`,
  "DF20:": `Dungeon Fantasy 20: Slayers`,
  DFA: `Dungeon Fantasy RPG: Adventurers`,
  "DFA1:": `Dungeon Fantasy Adventure 1: Mirror of the Fire Demon`,
  "DFA2:": `Dungeon Fantasy Adventure 2: Tomb of the Dragon King`,
  "DFA3:": `Dungeon Fantasy Adventure 3: Deep Night and the Star`,
  DFCG: `Dungeon Fantasy Career Guide`,
  DFDB: `Dungeon Fantasy Denizens: Barbarians`,
  DFDS: `Dungeon Fantasy Denizens: Swashbucklers`,
  "DFE1:": `Dungeon Fantasy Encounters 1: The Pagoda of Worlds`,
  "DFE2:": `Dungeon Fantasy Encounters 2: The Room`,
  "DFE3:": `Dungeon Fantasy Encounters 3: The Carnival of Madness`,
  DFM: `Dungeon Fantasy RPG: Monsters`,
  "DFM1:": `Dungeon Fantasy Monsters 1`,
  "DFM2:": `Dungeon Fantasy Monsters 2: Icky Goo`,
  "DFM3:": `Dungeon Fantasy Monsters 3: Born of Myth & Magic`,
  "DFM4:": `Dungeon Fantasy Monsters 4: Dragons`,
  "DFM5:": `Dungeon Fantasy Monsters 5: Demons`,
  "DFMI1:": `Dungeon Fantasy RPG: Magic Items 1`,
  "DFMI2:": `Dungeon Fantasy RPG: Magic Items 2`,
  "DFRC2:": `Dungeon Fantasy RPG: Companion 2`,
  "DFRM2:": `Dungeon Fantasy RPG: Monsters 2`,
  DFS: `Dungeon Fantasy RPG: Spells`,
  DFSC: `Dungeon Fantasy Setting: Caverntown`,
  DFSCSM: `Dungeon Fantasy Setting: Cold Shard Mountain`,
  "DFT1:": `Dungeon Fantasy Treasures 1: Glittering Prizes`,
  "DFT2:": `Dungeon Fantasy Treasures 2: Epic Treasures`,
  "DFT3:": `Dungeon Fantasy Treasures 3: Artifacts of Felltower`,
  "DFT4:": `Dungeon Fantasy Treasures 4: Mixed Blessings`,
  DFX: `Dungeon Fantasy RPG: Exploits`,
  DH: `Disasters: Hurricane`,
  DL: `Deadlands: Weird West (3E)`,
  DLH: `Deadlands: Hexes (3E)`,
  DLV: `Deadlands: Varmints (3E)`,
  DMF: `Disasters: Meltdown and Fallout`,
  "DN1:": `Deadlands: Dime Novel 1 - Aces and Eights (3E)`,
  "DN2:": `Deadlands: Dime Novel 2 - Wanted: Undead or Alive (3E)`,
  DR: `Dragons`,
  DTG: `Delvers To Grow`,
  DW: `Discworld Roleplaying Game`,
  EHHC: `Encounter: The Harrowed Hearts Club`,
  F: `Fantasy`,
  FED: `Federation`,
  FF: `Fantasy Folk (3E)`,
  FFE: `Fantasy Folk: Elves`,
  FFGH: `Fantasy Folk: Goblins and Hobgoblins`,
  FFK: `Fantasy Folk: Kobolds`,
  FFWF: `Fantasy Folk: Winged Folk`,
  FH: `Future History`,
  FPR: `Fantasy: Portal Realms`,
  "FT1:": `Fantasy-Tech 1: The Edge of Reality`,
  "FT2:": `Fantasy-Tech 2: Weapons of Fantasy`,
  FUR: `Furries`,
  FW: `Transhuman Space: Fifth Wave (3E)`,
  GF: `Gun Fu`,
  GG: `Girl Genius RPG`,
  GUL: `Gulliver Mini`,
  H: `Horror`,
  HF: `Historical Folks`,
  HMD: `Horror: The Madness Dossier`,
  HOSF: `Horror: The Old Stone Fort`,
  HOW: `How to Be a GURPS GM`,
  HOWRPM: `How to Be a GURPS GM: Ritual Path Magic`,
  HSC: `Hot Spots: Constantinople, 527-1204 A.D.`,
  HSIT: `Hot Spots: The Incense Trail`,
  HSRF: `Hot Spots: Renaissance Florence`,
  HSRV: `Hot Spots: Renaissance Venice`,
  HSS: `Hot Spots: Sriwijaya`,
  HSSR: `Hot Spots: The Silk Road`,
  HT: `High-Tech`,
  HTAG: `High-Tech: Adventure Guns`,
  HTEE: `High-Tech: Electricity and Electronics`,
  "HTPG1:": `High-Tech: Pulp Guns 1`,
  "HTPG2:": `High-Tech: Pulp Guns 2`,
  HTWT: `High-Tech: Weapon Tables`,
  IW: `Infinite Worlds`,
  IWB: `Infinite Worlds: Britannica-6`,
  IWCJ: `Infinite Worlds: Collegio Januari`,
  IWLW: `Infinite Worlds: Lost Worlds`,
  IWWH: `Infinite Worlds: Worlds of Horror`,
  KL: `Klingons`,
  L: `Lite`,
  LFM: `Lair of the Fat Man`,
  LH: `Locations: Hellsgate`,
  LMM: `Locations: Metro of Madness`,
  LOLTA: `Loadouts: Low-Tech Armor`,
  LOMH: `Loadouts: Monster Hunters`,
  LOT: `Lands Out of Time`,
  LSGC: `Locations: St. George's Cathedral`,
  LT: `Low-Tech`,
  "LTC1:": `Low-Tech Companion 1: Philosophers and Kings`,
  "LTC2:": `Low-Tech Companion 2: Weapons and Warriors`,
  "LTC3:": `Low-Tech Companion 3: Daily Life and Economics`,
  LTIA: `Low-Tech: Instant Armor`,
  LTO: `Locations: Tower of Octavius`,
  LW: `Locations: Worminghall`,
  M: `Magic`,
  MA: `Martial Arts`,
  MAFCCS: `Martial Arts: Fairbairn Close Combat Systems`,
  MAG: `Martial Arts: Gladiators`,
  MAS: `Magic: Artillery Spells`,
  MATG: `Martial Arts: Technical Grappling`,
  MAYFS: `Martial Arts: Yrth Fighting Styles`,
  MC: `Mass Combat`,
  MDS: `Magic: Death Spells`,
  MGA: `MacGuffin Alphabet`,
  "MH1:": `Monster Hunters 1: Champions`,
  "MH2:": `Monster Hunters 2: The Mission`,
  "MH3:": `Monster Hunters 3: The Enemy`,
  "MH4:": `Monster Hunters 4: Sidekicks`,
  "MH5:": `Monster Hunters 5: Applied Xenology`,
  "MH6:": `Monster Hunters 6: Holy Hunters`,
  "MHE1:": `Monster Hunters Encounters 1`,
  "MHPU1:": `Monster Hunters Power-Ups 1`,
  MPS: `Magic: Plant Spells`,
  MSDM: `Magical Styles: Dungeon Magic`,
  MSHM: `Magical Styles: Horror Magic`,
  MTLOS: `Magic: The Least of Spells`,
  MYST: `Mysteries`,
  MYTH: `Myth (3E)`,
  NBB: `Nordlondr Bestiary: Bugstiary`,
  NBE: `Nordlondr Bestiary and Enemies Book`,
  NBG: `Nordlondr Bestiary: Garden of Evil`,
  NBS: `Nordlondr Bestiary: Serpents of Legend`,
  NF: `Nordlondr Folk`,
  P: `Powers`,
  PC: `Psionic Campaigns`,
  PD: `Prime Directive`,
  PDF: `Powers: Divine Favor`,
  PDFC: `Pyramid: Dungeon Fantasy Collected`,
  PES: `Powers: Enhanced Senses`,
  // PP: `Psionic Powers`,
  PSI: `Psionic Powers`,
  PSIS: `Psis`,
  PT: `Psi-Tech`,
  PTNS: `Powers: Totems and Nature Spirits`,
  "PU1:": `Power-Ups 1: Imbuements`,
  "PU2:": `Power-Ups 2: Perks`,
  "PU3:": `Power-Ups 3: Talents`,
  "PU4:": `Power-Ups 4: Enhancements`,
  "PU5:": `Power-Ups 5: Impulse Buys`,
  "PU6:": `Power-Ups 6: Quirks`,
  "PU7:": `Power-Ups 7: Wildcard Skills`,
  "PU8:": `Power-Ups 8: Limitations`,
  "PU9:": `Power-Ups 9: Alternate Attributes`,
  PW: `Powers: The Weird`,
  "PY#:": `Pyramid 3 issues (replace # with the issue number, but leave out the leading "3-")`,
  "PY4-#:": `Pyramid 4 issues (replace # with the issue number)`,
  PYDC: `Pyramid Dungeon Collection`,
  RM: `Realm Management`,
  ROM: `Romulans`,
  RSRS: `Reign of Steel: Read the Sky`,
  RSWL: `Reign of Steel: Will to Live`,
  S: `Space`,
  SCASPC: `Supporting Cast: Age of Sail Pirate Crew`,
  SE: `Social Engineering`,
  SEAL: `SEALs in Vietnam`,
  SEBS: `Social Engineering: Back to School`,
  SEKC: `Social Engineering: Keeping in Contact`,
  SEPR: `Social Engineering: Pulling Rank`,
  "SP1:": `Steampunk 1: Settings and Style`,
  "SP2:": `Steampunk 2: Steam and Shellfire`,
  "SP3:": `Steampunk 3: Soldiers and Scientists`,
  SPWS: `Sorcery: Protection and Warning Spells`,
  "SS1:": `Spaceships`,
  "SS2:": `Spaceships 2: Traders, Liners, and Transports`,
  "SS3:": `Spaceships 3: Warships and Space Pirates`,
  "SS4:": `Spaceships 4: Fighters, Carriers, and Mecha`,
  "SS5:": `Spaceships 5: Exploration and Colony Spacecraft`,
  "SS6:": `Spaceships 6: Mining and Industrial Spacecraft`,
  "SS7:": `Spaceships 7: Divergent and Paranormal Tech`,
  "SS8:": `Spaceships 8: Transhuman Spacecraft`,
  SSS: `Sorcery: Sound Spells`,
  SU: `Supers`,
  // Th: `Thaumatology`,
  T: `Thaumatology`,
  TAB: `Thaumatology: Alchemical Baroque`,
  TAG: `Thaumatology: Age of Gold`,
  TCEP: `Thaumatology: Chinese Elemental Powers`,
  THS: `Transhuman Space`,
  THSBB: `Transhuman Space: Bioroid Bazaar`,
  THSBT: `Transhuman Space: Bio-Tech 2100`,
  THSCE: `Transhuman Space: Cities on the Edge`,
  THSCT: `Transhuman Space: Changing Times`,
  THSMA: `Transhuman Space: Martial Arts 2100`,
  "THSPF2:": `Transhuman Space: Personnel Files 2 - The Meme Team`,
  "THSPF3:": `Transhuman Space: Personnel Files 3 - Wild Justice`,
  "THSPF4:": `Transhuman Space: Personnel Files 4 - Martingale Security`,
  "THSPF5:": `Transhuman Space: Personnel Files 5 - School Days 2100`,
  THSST: `Transhuman Space: Shell-Tech`,
  THSTM: `Transhuman Space: Transhuman Mysteries`,
  "THSTN1:": `Transhuman Space: Teralogos News - 2100, Fourth Quarter`,
  "THSTN2:": `Transhuman Space: Teralogos News - 2101, First Quarter`,
  "THSTN3:": `Transhuman Space: Teralogos News - 2101, Second Quarter`,
  "THSTN4:": `Transhuman Space: Teralogos News - 2101, Third Quarter`,
  THSTX: `Transhuman Space: Toxic Memes`,
  THSUP: `Transhuman Space: Under Pressure`,
  THSWRS: `Transhuman Space: Wings of the Rising Sun`,
  "TIW:": `Traveller: Interstellar Wars`,
  TMS: `Thaumatology: Magical Styles`,
  TRPM: `Thaumatology: Ritual Path Magic`,
  TS: `Tactical Shooting`,
  TSOR: `Thaumatology: Sorcery`,
  TSP: `Tales of the Solar Patrol`,
  "TT1:": `Template Toolkit 1: Characters`,
  "TT2:": `Template Toolkit 2: Races`,
  "TT3:": `Template Toolkit 3: Starship Crew`,
  TUM: `Thaumatology: Urban Magics`,
  UA: `Underground Adventures`,
  UL: `Ultra-Lite`,
  UT: `Ultra-Tech`,
  UTWT: `Ultra-Tech: Weapon Tables`,
  VOR: `Vorkosigan Saga RPG`,
  VSC: `Vehicles: Steampunk Conveyances`,
  VTF: `Vehicles: Transports of Fantasy`,
  Z: `Zombies`,
  ZDO: `Zombies: Day One`,
}

export const GCA_TO_GCS_REFERENCE = {
  PP: `PSI`,
  Th: `T`,
  "LT:IA": `LTIA`,
}

export interface PageReference {
  type: `page`
  abbreviation: string
  book: string
  page: Range
}

export interface LinkReference {
  type: `link`
  url: string
  text?: string
}

export interface CustomReference {
  type: `custom`
  text?: string
}

export type TraitReference = PageReference | LinkReference | CustomReference

export function parsePageNotation(pageNotation: string): TraitReference[] {
  const pageNotations = pageNotation.split(/ *, */)
  const notations = pageNotations.map(parseSinglePageNotation)

  return notations
}

export function parseSinglePageNotation(pageNotation: string): TraitReference {
  if (pageNotation.toLocaleLowerCase() === `[custom]`) return { type: `custom` }
  if (pageNotation.toLocaleLowerCase().startsWith(`[url]`)) {
    const hasText = pageNotation.slice(5).split(/^(\{[^\}]+})/)

    if (hasText.length === 1) return { type: `link`, url: hasText[0] }
    else return { type: `link`, url: hasText[2], text: hasText[1].slice(1, -1) }
  }

  let abbreviation: string
  let page: Range

  // 1. Parse page number
  const rangeNotation = pageNotation.split(/(\d+)-(\d+)$/)
  if (rangeNotation.length === 4) {
    const [_, start, end] = rangeNotation

    abbreviation = rangeNotation[0]

    assert(isNumeric(start), `Start page number must be a number`)
    assert(isNumeric(end), `End page number must be a number`)

    page = Range.fromInterval(parseInt(start), parseInt(end))
  } else {
    const _notation = pageNotation.split(/(\d+)$/)
    assert(_notation.length === 3, `Invalid page notation`)

    abbreviation = _notation[0]

    assert(isNumeric(_notation[1]), `Page number must be a number`)
    page = Range.fromPoint(parseInt(_notation[1]))
  }

  // 2. Adjust from GCA to GCS conventions
  const lookUp = GCA_TO_GCS_REFERENCE[abbreviation]
  if (lookUp) abbreviation = lookUp

  // 3. Adjust B -> BX for correct page
  if (abbreviation === `B`) if (page.column(`first`) >= 338) abbreviation = `BX`

  const book = BOOK_REFERENCES[abbreviation]
  assert(book, `Invalid book abbreviation: ${abbreviation}`)

  return { type: `page`, abbreviation, book, page }
}