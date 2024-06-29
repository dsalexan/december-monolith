import { CharacterDataSchema } from "./base"
import path from "path"
import CharacterSheet from "."
import GCAImporter from "./importer"

const character = new CharacterSheet(CharacterDataSchema)
const importer = new GCAImporter()

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)
importer.import(character, pathfile).then(() => {
  character.calculate()
  debugger
  // character.calculateCER()
})
