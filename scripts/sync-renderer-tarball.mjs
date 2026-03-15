import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import {
  assertRendererIdentity,
  canaryRoot,
  getDependencyVersion,
  packageLockPath,
  packageJsonPath,
  readJson,
  readTarballPackageJson,
  releaseMetadataPath,
  sha256File,
  vendorDir,
  writeJson,
} from './lib/renderer-metadata.mjs'

const sourceTarball = process.argv[2]

if (!sourceTarball) {
  console.error('Usage: npm run sync:renderer -- /absolute/path/to/the-syllabus-analysis-renderers-X.Y.Z.tgz')
  process.exit(1)
}

const sourceTarballPath = path.resolve(sourceTarball)
if (!fs.existsSync(sourceTarballPath)) {
  console.error(`Renderer tarball not found: ${sourceTarballPath}`)
  process.exit(1)
}

const tarballPackage = readTarballPackageJson(sourceTarballPath)
assertRendererIdentity(tarballPackage)

const nextVersion = tarballPackage.version
const currentVersion = getDependencyVersion()

if (nextVersion === currentVersion) {
  console.error(
    `Refusing same-version renderer sync (${nextVersion}). Bump renderers-ui/package.json first.`,
  )
  process.exit(1)
}

const tarballFilename = path.basename(sourceTarballPath)
const tarballSha256 = sha256File(sourceTarballPath)

fs.mkdirSync(vendorDir, { recursive: true })
const existingTarballs = fs
  .readdirSync(vendorDir)
  .filter((entry) => /^the-syllabus-analysis-renderers-.*\.tgz$/.test(entry))

const packageJsonBackup = fs.readFileSync(packageJsonPath)
const packageLockBackup = fs.existsSync(packageLockPath) ? fs.readFileSync(packageLockPath) : null
const releaseMetadataBackup = fs.existsSync(releaseMetadataPath)
  ? fs.readFileSync(releaseMetadataPath)
  : null

const targetTarballPath = path.join(vendorDir, tarballFilename)
fs.copyFileSync(sourceTarballPath, targetTarballPath)

const packageJson = readJson(packageJsonPath)
packageJson.dependencies['@the-syllabus/analysis-renderers'] = `file:vendor/${tarballFilename}`
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

const installResult = spawnSync('npm', ['install'], {
  cwd: canaryRoot,
  stdio: 'inherit',
  env: process.env,
})

if (installResult.status !== 0) {
  fs.writeFileSync(packageJsonPath, packageJsonBackup)

  if (packageLockBackup) {
    fs.writeFileSync(packageLockPath, packageLockBackup)
  }

  if (releaseMetadataBackup) {
    fs.writeFileSync(releaseMetadataPath, releaseMetadataBackup)
  } else if (fs.existsSync(releaseMetadataPath)) {
    fs.rmSync(releaseMetadataPath, { force: true })
  }

  if (!existingTarballs.includes(tarballFilename) && fs.existsSync(targetTarballPath)) {
    fs.rmSync(targetTarballPath, { force: true })
  }

  const restoreResult = spawnSync('npm', ['install'], {
    cwd: canaryRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (restoreResult.status !== 0) {
    console.error('Renderer sync failed and reinstalling the previous dependency state also failed.')
  } else {
    console.error('Renderer sync failed. Restored the previous vendored dependency state.')
  }

  process.exit(installResult.status ?? 1)
}

writeJson(releaseMetadataPath, {
  renderer_package_name: tarballPackage.name,
  renderer_package_version: nextVersion,
  renderer_tarball_filename: tarballFilename,
  renderer_tarball_sha256: tarballSha256,
})

for (const entry of existingTarballs) {
  if (entry !== tarballFilename) {
    fs.rmSync(path.join(vendorDir, entry), { force: true })
  }
}
