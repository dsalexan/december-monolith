import Promise from "bluebird"
import sharp from "sharp"
import xmldom from "xmldom"
import fs from "fs"
import path from "path"

import { parse } from "svg-parser"

type File = { content: string; path: string; name: string }

type SVGDefinition = {
  name: string
  viewbox: string
  svg: string
}

export async function svgToPng(destination: string, file: File, spec: { color: string; size: number; specNameFile: boolean }) {
  // get viewbox width as datum
  let viewbox = file.content.match(/viewBox="0 0 (\d+.?\d*) \d+/)
  if (viewbox === null) {
    console.error(`  Could not parse ${file.name} viewBox`)
    viewbox = [`0`, `24`]
  }
  const width = parseFloat(viewbox[1])

  const xml = new xmldom.DOMParser().parseFromString(file.content, `text/xml`)
  const svgs = xml.getElementsByTagName(`svg`)
  if (!svgs) throw new Error(`No SVG in ${file.name}`)

  // get svg and set attributess
  const svg = svgs.item(0)!
  svg.setAttribute(`width`, `${spec.size * (width / 24)}px`)
  svg.setAttribute(`height`, `${spec.size}px`)
  svg.setAttribute(`fill`, spec.color)

  // convert into png and resize
  const png = sharp(Buffer.from(new xmldom.XMLSerializer().serializeToString(xml)))
  const resizedPNG = png.resize(spec.size)

  // save png
  let output = destination
  if (spec.specNameFile) {
    const path_ = path.parse(destination)
    output = `${path_.dir}/${path_.name.replace}-${spec.size}-${spec.color}.png}`
    debugger
  }

  const path_ = path.parse(output)
  if (!fs.existsSync(path_.dir)) fs.mkdirSync(path_.dir, { recursive: true })

  const savedPNG = await resizedPNG.toFile(output)

  return savedPNG
}

/**
 * Returns all files in a directory
 */
export function readDirectory(directory: string, recursive = false) {
  const files = [] as File[]

  const isDirectory = fs.statSync(directory).isDirectory()
  let paths = [] as string[]

  if (isDirectory) paths = fs.readdirSync(directory)
  else {
    const path_ = path.parse(directory)
    directory = path_.dir
    paths = [path_.base]
  }

  for (const filepath of paths) {
    const fullpath = path.join(directory, filepath)
    if (fs.statSync(fullpath).isDirectory()) {
      if (recursive) files.push(...readDirectory(fullpath, recursive))
      continue
    }

    const content = fs.readFileSync(fullpath, `utf8`)
    files.push({ content, path: fullpath, name: filepath })
  }

  return files
}

export function svgDefinition(file: File): SVGDefinition | null {
  const name = file.name.replace(/.svg$/i, ``)

  const content = fs.readFileSync(file.path, `utf8`)
  const dom = parse(content)
  const children = dom.children as ((typeof dom.children)[number] & { tagName: string; properties: Record<string, unknown> })[]

  // VALIDATIONS AND NARROWING DOWN

  const svg = children.find(node => (node.tagName = `svg`))
  if (!svg) {
    console.error(`  Could not parse ${file.name} svg tag`)
    return null
  }

  if (!svg.properties?.viewBox) {
    console.error(`  Could not parse ${file.name} viewBox`)
    return null
  }

  // const result = content.replaceAll(/[\t\r\n]+/gi, ``).matchAll(/<svg\b[^>]*?>([\s\S]*?)<\/svg>/gm)
  const result = /<svg\b[^>]*?>([\s\S]*?)<\/svg>/gm.exec(content.replaceAll(/[\t\r\n]+/gi, ``))
  if (!result || !result[1]) {
    console.error(`  Could not parse ${file.name} inner svg`)
    return null
  }

  const innerSVG = result[1]

  return {
    name,
    viewbox: svg.properties.viewBox as string,
    svg: innerSVG,
  }
}
