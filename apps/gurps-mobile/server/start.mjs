// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = `development`
process.env.NODE_ENV = `development`

const PORT = process.env.PORT || 30000
const HOST = process.env.HOST || `0.0.0.0`
process.env.PUBLIC_URL = process.env.PUBLIC_URL || `localhost:${PORT}`

import { resolve } from "path"
import { realpathSync } from "fs"
import webpack from "webpack"
import WebpackDevServer from "webpack-dev-server"

import chalk from "chalk"

import webpackConfig from "../webpack.config.js"

// Stablish paths beforehand
const DIRECTORY = realpathSync(process.cwd())
const BUILD_PATH = resolve(DIRECTORY, `dist`)
const PACKAGE_JSON_PATH = resolve(DIRECTORY, `package.json`)

const config = webpackConfig({
  watch: false,
  mode: `development`,
})
const compiler = webpack(config)

const server = new WebpackDevServer(
  {
    // port: 30003,
    // host: `127.0.0.1`, // <-- this
    hot: true,
    // liveReload: true,
    // open: [`http://localhost:30000/game`],
    devMiddleware: {
      writeToDisk: true,
    },
    proxy: [
      {
        context: pathname => {
          return !pathname.match(`^/ws`)
        },
        target: `http://localhost:30000`,
        ws: true,
      },
    ],
    // client: {
    //   logging: `verbose`,
    //   overlay: {
    //     warnings: false,
    //     errors: false,
    //   },
    // },
  },
  compiler,
)

const runServer = async () => {
  console.log(chalk.cyan(`Starting development server...\n`))
  await server.start()
}

runServer()
