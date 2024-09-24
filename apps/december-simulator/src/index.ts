import path from "path"

import { GURPS } from "./system"
import GCAImporter from "./system/gurps/importer/GCA"

import churchil from "./logger"

const system = new GURPS(churchil)
const importer = new GCAImporter(churchil)

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)

const test = system.makeCharacter()
importer.import(pathfile, test).then(() => {
  debugger
})
