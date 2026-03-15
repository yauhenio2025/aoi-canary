import {
  blessedProductionUrl,
  parseBundleAssets,
  readBuildMetadata,
  sha256Buffer,
} from './lib/renderer-metadata.mjs'

const targetUrl = (process.argv[2] || blessedProductionUrl).replace(/\/$/, '')
const expected = readBuildMetadata()

const indexResponse = await fetch(`${targetUrl}/`)
if (!indexResponse.ok) {
  throw new Error(`Failed to fetch live index.html from ${targetUrl}/: ${indexResponse.status} ${indexResponse.statusText}`)
}

const liveIndexHtml = await indexResponse.text()
const liveIndexAssets = parseBundleAssets(liveIndexHtml)

const response = await fetch(`${targetUrl}/renderer-build.json`)
if (!response.ok) {
  throw new Error(`Failed to fetch live renderer metadata from ${targetUrl}/renderer-build.json: ${response.status} ${response.statusText}`)
}

const live = await response.json()

for (const key of [
  'renderer_package_name',
  'renderer_package_version',
  'renderer_tarball_filename',
  'renderer_tarball_sha256',
]) {
  if (live[key] !== expected[key]) {
    throw new Error(`Live renderer metadata mismatch for ${key}: expected ${expected[key]}, got ${live[key]}`)
  }
}

if (!Array.isArray(live.bundle_assets) || !Array.isArray(expected.bundle_assets)) {
  throw new Error('renderer-build.json is missing bundle_assets')
}

if (live.bundle_assets.length !== expected.bundle_assets.length) {
  throw new Error('Live bundle asset count does not match expected bundle asset count')
}

const expectedAssetPaths = expected.bundle_assets.map((asset) => asset.path).sort()
const liveMetadataAssetPaths = live.bundle_assets.map((asset) => asset.path).sort()

if (JSON.stringify(liveMetadataAssetPaths) !== JSON.stringify(expectedAssetPaths)) {
  throw new Error(
    `Live renderer metadata asset paths do not match expected bundle assets: expected ${expectedAssetPaths.join(', ')}, got ${liveMetadataAssetPaths.join(', ')}`,
  )
}

if (JSON.stringify(liveIndexAssets) !== JSON.stringify(expectedAssetPaths)) {
  throw new Error(
    `Live index.html asset paths do not match expected bundle assets: expected ${expectedAssetPaths.join(', ')}, got ${liveIndexAssets.join(', ')}`,
  )
}

for (const expectedAsset of expected.bundle_assets) {
  const liveAsset = live.bundle_assets.find((asset) => asset.path === expectedAsset.path)

  if (!liveAsset) {
    throw new Error(`Live renderer metadata is missing bundle asset ${expectedAsset.path}`)
  }

  if (liveAsset.sha256 !== expectedAsset.sha256) {
    throw new Error(
      `Live renderer metadata mismatch for ${expectedAsset.path}: expected ${expectedAsset.sha256}, got ${liveAsset.sha256}`,
    )
  }

  const assetResponse = await fetch(`${targetUrl}/${expectedAsset.path}`)
  if (!assetResponse.ok) {
    throw new Error(
      `Failed to fetch live bundle asset ${targetUrl}/${expectedAsset.path}: ${assetResponse.status} ${assetResponse.statusText}`,
    )
  }

  const liveAssetHash = sha256Buffer(Buffer.from(await assetResponse.arrayBuffer()))
  if (liveAssetHash !== expectedAsset.sha256) {
    throw new Error(
      `Live bundle asset hash mismatch for ${expectedAsset.path}: expected ${expectedAsset.sha256}, got ${liveAssetHash}`,
    )
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      deploy_url: targetUrl,
      ...live,
    },
    null,
    2,
  )}\n`,
)
