import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const canaryRoot = path.resolve(__dirname, '..', '..')
export const vendorDir = path.join(canaryRoot, 'vendor')
export const releaseMetadataPath = path.join(vendorDir, 'renderer-release.json')
export const packageJsonPath = path.join(canaryRoot, 'package.json')
export const packageLockPath = path.join(canaryRoot, 'package-lock.json')
export const installPackageJsonPath = path.join(
  canaryRoot,
  'node_modules',
  '@the-syllabus',
  'analysis-renderers',
  'package.json',
)
export const distDir = path.join(canaryRoot, 'dist')
export const buildMetadataPath = path.join(distDir, 'renderer-build.json')
export const blessedProductionUrl = 'https://aoi-canary.onrender.com'

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

export function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function getDependencyTarballName() {
  const packageJson = readJson(packageJsonPath)
  const dependency = packageJson.dependencies?.['@the-syllabus/analysis-renderers']

  if (typeof dependency !== 'string' || !dependency.startsWith('file:vendor/')) {
    throw new Error('package.json does not point @the-syllabus/analysis-renderers at a vendored tarball')
  }

  return dependency.slice('file:vendor/'.length)
}

export function getDependencyTarballPath() {
  return path.join(vendorDir, getDependencyTarballName())
}

export function getDependencyVersion() {
  const tarballName = getDependencyTarballName()
  const match = tarballName.match(/the-syllabus-analysis-renderers-(.+)\.tgz$/)

  if (!match) {
    throw new Error(`Could not parse renderer version from dependency path: ${tarballName}`)
  }

  return match[1]
}

export function readReleaseMetadata() {
  return readJson(releaseMetadataPath)
}

export function readBuildMetadata() {
  return readJson(buildMetadataPath)
}

export function readInstalledPackageJson() {
  return readJson(installPackageJsonPath)
}

export function readTarballPackageJson(tarballPath) {
  const tarOutput = execFileSync('tar', ['-xOzf', tarballPath, 'package/package.json'], {
    encoding: 'utf8',
  })
  return JSON.parse(tarOutput)
}

export function assertRendererIdentity(pkg) {
  const packageName = pkg?.name ?? pkg?.renderer_package_name

  if (packageName !== '@the-syllabus/analysis-renderers') {
    throw new Error(`Unexpected renderer package identity: ${packageName}`)
  }
}

export function parseBundleAssets(indexHtml) {
  const assetPaths = new Set()
  const assetPattern = /(?:src|href)="\/?(assets\/[^"]+)"/g

  for (const match of indexHtml.matchAll(assetPattern)) {
    assetPaths.add(match[1])
  }

  return Array.from(assetPaths).sort()
}
