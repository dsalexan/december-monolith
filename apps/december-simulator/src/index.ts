import path from "path"

import { GCACharacter, GCACharacterImporter } from "@december/gca"

import churchil from "./logger"

const importer = new GCACharacterImporter(churchil)

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)

const character = new GCACharacter()
importer.import(pathfile, character).then(() => {
  debugger
})
