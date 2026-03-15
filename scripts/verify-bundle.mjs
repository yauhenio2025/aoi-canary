import fs from 'node:fs'
import path from 'node:path'

import {
  buildMetadataPath,
  distDir,
  parseBundleAssets,
  readReleaseMetadata,
  sha256File,
  writeJson,
} from './lib/renderer-metadata.mjs'

if (!fs.existsSync(distDir)) {
  throw new Error(`dist directory does not exist: ${distDir}`)
}

const metadata = readReleaseMetadata()
const indexHtmlPath = path.join(distDir, 'index.html')
if (!fs.existsSync(indexHtmlPath)) {
  throw new Error(`dist/index.html does not exist: ${indexHtmlPath}`)
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8')
const bundleAssets = parseBundleAssets(indexHtml).map((assetPath) => {
  const assetFilePath = path.join(distDir, assetPath)

  if (!fs.existsSync(assetFilePath)) {
    throw new Error(`Bundle asset referenced by index.html is missing: ${assetPath}`)
  }

  return {
    path: assetPath,
    sha256: sha256File(assetFilePath),
  }
})

if (!bundleAssets.some((asset) => asset.path.endsWith('.js'))) {
  throw new Error('Bundle metadata is missing a JavaScript asset')
}

const buildMetadata = {
  ...metadata,
  bundle_assets: bundleAssets,
}

writeJson(buildMetadataPath, buildMetadata)

const written = JSON.parse(fs.readFileSync(buildMetadataPath, 'utf8'))

for (const key of Object.keys(buildMetadata)) {
  if (JSON.stringify(written[key]) !== JSON.stringify(buildMetadata[key])) {
    throw new Error(`renderer-build.json mismatch for ${key}`)
  }
}
