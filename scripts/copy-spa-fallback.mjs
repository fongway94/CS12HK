import { copyFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, "..", "dist")
const indexPath = resolve(distDir, "index.html")
const fallbackPath = resolve(distDir, "404.html")

if (!existsSync(indexPath)) {
  throw new Error("Cannot create SPA fallback: dist/index.html does not exist")
}

copyFileSync(indexPath, fallbackPath)
console.log("Created dist/404.html from dist/index.html")
