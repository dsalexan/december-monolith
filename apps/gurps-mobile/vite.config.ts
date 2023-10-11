import { MODULE_ID, MODULE_NAME, VERSION } from "./config/index.js"

import { execSync } from "child_process"
import esbuild from "esbuild"
import fs from "fs-extra"
import path from "path"
import chalk from "chalk"

import * as Vite from "vite"
import checker from "vite-plugin-checker"
import { viteStaticCopy } from "vite-plugin-static-copy"
import tsconfigPaths from "vite-tsconfig-paths"
import { replaceCodePlugin } from "vite-plugin-replace"
import { globSync } from "glob"

import rollupNodePolyFill from "rollup-plugin-node-polyfills"

const TEMPLATES = globSync(`**/*.hbs`, { cwd: path.join(__dirname, `static/templates`) }).map(file => `modules/${MODULE_ID}/templates/${file}`.replaceAll(/\\/g, `/`))

const config = Vite.defineConfig(({ command, mode }): Vite.UserConfig => {
  const buildMode = mode === `production` ? `production` : `development`
  const outDir = path.join(__dirname, `dist`)

  const plugins = [
    checker({ typescript: false }),
    tsconfigPaths(),
    replaceCodePlugin({
      replacements: [
        {
          from: /__WEBPACK__MODULE_ID__/g,
          to: MODULE_ID,
        },
        {
          from: /__WEBPACK__MODULE_NAME__/g,
          to: MODULE_NAME,
        },
        {
          from: /__WEBPACK__MODULE_VERSION__/g,
          to: VERSION,
        },
      ],
    }),
  ]

  // {
  //   dir: path.join(__dirname, `dist`),
  //   files: [`module.json`],
  //   rules: [
  //     { search: /__WEBPACK__MODULE_ID__/g, replace: config.MODULE_ID },
  //     { search: /__WEBPACK__MODULE_NAME__/g, replace: config.MODULE_NAME },
  //     { search: /__WEBPACK__MODULE_VERSION__/g, replace: config.VERSION },
  //     { search: /"?__WEBPACK__BUNDLE_FILES__"?,?/, replace: [`client.js`, `hot.js`, `js/lodash.bundle.js`].map(path => `"${path}"`).join(`,\n`) },
  //   ].filter(Boolean),

  // Handle minification after build to allow for tree-shaking and whitespace minification
  // "Note the build.minify option does not minify whitespaces when using the 'es' format in lib mode, as it removes
  // pure annotations and breaks tree-shaking."

  if (buildMode === `production`) {
    // plugins.push(
    //   {
    //     name: `minify`,
    //     renderChunk: {
    //       order: `post`,
    //       async handler(code, chunk) {
    //         return chunk.fileName.endsWith(`.mjs`)
    //           ? esbuild.transform(code, {
    //               keepNames: true,
    //               minifyIdentifiers: false,
    //               minifySyntax: true,
    //               minifyWhitespace: true,
    //             })
    //           : code
    //       },
    //     },
    //   },
    //   ...viteStaticCopy({
    //     targets: [
    //       { src: `CHANGELOG.md`, dest: `.` },
    //       { src: `README.md`, dest: `.` },
    //       { src: `CONTRIBUTING.md`, dest: `.` },
    //     ],
    //   }),
    // )
  } else {
    plugins.push(
      // Foundry expects all esm files listed in system.json to exist: create empty vendor module when in dev mode
      {
        name: `touch-vendor-mjs`,
        apply: `build`,
        writeBundle: {
          async handler() {
            fs.closeSync(fs.openSync(path.resolve(outDir, `vendor.mjs`), `w`))
          },
        },
      },
      // Vite HMR is only preconfigured for css files: add handler for HBS templates
      {
        name: `hmr-handler`,
        apply: `serve`,
        handleHotUpdate(context) {
          const isHandlebars = context.file.endsWith(`.hbs`)
          const isDist = context.file.startsWith(outDir) || context.file.startsWith(outDir.replace(/\\/g, `/`))

          if (isHandlebars && !isDist) {
            const basePath = context.file.slice(context.file.indexOf(`templates/`))
            console.log(chalk.grey(`  Updating template at ${chalk.white(basePath)}`))

            // create directory tree if it doesn't exist
            const { dir } = path.parse(`${outDir}/${basePath}`)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

            // copy from static to dist
            fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
              context.server.ws.send({
                type: `custom`,
                event: `template-update`,
                data: { path: `modules/${MODULE_ID}/${basePath}` },
              })
            })
          }
        },
      },
    )
  }

  // Create dummy files for vite dev server
  if (command === `serve`) {
    const message = `This file is for a running vite dev server and is not copied to a build`
    fs.writeFileSync(`./index.html`, `<h1>${message}</h1>\n`)
    fs.writeFileSync(`./${MODULE_ID}.css`, `/** ${message} */\n`)
    fs.writeFileSync(`./${MODULE_ID}.mjs`, `/** ${message} */\n\nimport "./apps/${MODULE_ID}/src/index.ts";\n`)
    fs.writeFileSync(`./vendor.mjs`, `/** ${message} */\n`)
  }

  return {
    base: command === `build` ? `./` : `/modules/${MODULE_ID}/`,
    publicDir: path.join(__dirname, `static`),
    define: {
      BUILD_MODE: JSON.stringify(buildMode),
      TEMPLATES: JSON.stringify(TEMPLATES),
      // CONDITION_SOURCES: JSON.stringify(CONDITION_SOURCES),
      // EN_JSON: JSON.stringify(EN_JSON),
      // RE_EN_JSON: JSON.stringify(RE_EN_JSON),
      // ROLL_PARSER: Peggy.generate(rollGrammar, { output: `source` }),
    },
    esbuild: { keepNames: true },

    resolve: {
      alias: [
        { find: `@utils`, replacement: path.join(process.cwd(), `packages/utils/src/styles`) },
        { find: `@components`, replacement: path.join(process.cwd(), `apps/gurps-mobile/src/styles/components`) },
        { find: `util`, replacement: `rollup-plugin-node-polyfills/polyfills/util` },
      ],
    },

    build: {
      outDir,
      emptyOutDir: true, // fails if world is running due to compendium locks. We do it in "npm run clean" instead.
      minify: false,
      sourcemap: buildMode === `development`,
      lib: {
        name: MODULE_ID,
        entry: path.join(__dirname, `src/index.ts`),
        formats: [`es`],
        fileName: MODULE_ID,
      },
      rollupOptions: {
        output: {
          assetFileNames: ({ name }): string => (name === `style.css` ? `${MODULE_ID}.css` : name!),
          chunkFileNames: `[name].mjs`,
          entryFileNames: `${MODULE_ID}.mjs`,
          // manualChunks:
          // function (id, { getModuleInfo }) {
          //   if (id.match(/[\\/]node_modules[\\/](lodash|lodash-es)[\\/]/)) return `lodash`
          //   if (id.match(/[\\/]node_modules[\\/](@mdi)[\\/]/)) return `mdi`
          //   if (id.includes(`node_modules`)) return `vendor`
          // },
          // {
          //   vendor: buildMode === `production` ? Object.keys(packageJSON.dependencies) : [],
          // },
        },
        watch: { buildDelay: 100 },
      },
      target: `es2022`,
    },
    server: {
      port: 30001,
      // open: `/game`,
      proxy: {
        [`^(?!/modules/${MODULE_ID}/)`]: `http://localhost:30000/`,
        "/socket.io": {
          target: `ws://localhost:30000`,
          ws: true,
        },
      },
    },
    plugins,
    css: {
      devSourcemap: buildMode === `development`,
    },
  }
})

export default config
