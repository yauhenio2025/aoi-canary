import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  assertRendererIdentity,
  getDependencyTarballName,
  getDependencyTarballPath,
  getDependencyVersion,
  installPackageJsonPath,
  readInstalledPackageJson,
  readReleaseMetadata,
  readTarballPackageJson,
  releaseMetadataPath,
  sha256File,
} from './lib/renderer-metadata.mjs'

const tarballPath = getDependencyTarballPath()
if (!fs.existsSync(tarballPath)) {
  throw new Error(`Vendored renderer tarball is missing: ${tarballPath}`)
}

if (!fs.existsSync(releaseMetadataPath)) {
  throw new Error(`Renderer release metadata is missing: ${releaseMetadataPath}`)
}

const metadata = readReleaseMetadata()
const tarballPackage = readTarballPackageJson(tarballPath)
const installedPackage = readInstalledPackageJson()
const installedVersionModulePath = path.join(path.dirname(installPackageJsonPath), 'dist', 'generated', 'version.js')
const installedVersionModule = await import(pathToFileURL(installedVersionModulePath).href)
const tarballSha256 = sha256File(tarballPath)
const dependencyTarballName = getDependencyTarballName()
const dependencyVersion = getDependencyVersion()

assertRendererIdentity(metadata)
assertRendererIdentity(tarballPackage)
assertRendererIdentity(installedPackage)

if (metadata.renderer_tarball_filename !== dependencyTarballName) {
  throw new Error(
    `Dependency points to ${dependencyTarballName}, but vendor metadata expects ${metadata.renderer_tarball_filename}`,
  )
}

if (metadata.renderer_tarball_filename !== path.basename(tarballPath)) {
  throw new Error('Vendored tarball filename does not match release metadata')
}

if (metadata.renderer_tarball_sha256 !== tarballSha256) {
  throw new Error('Vendored tarball SHA-256 does not match release metadata')
}

if (metadata.renderer_package_version !== dependencyVersion) {
  throw new Error('Dependency version does not match release metadata version')
}

if (tarballPackage.version !== metadata.renderer_package_version) {
  throw new Error('Tarball package version does not match release metadata version')
}

if (installedPackage.version !== metadata.renderer_package_version) {
  throw new Error('Installed package version does not match release metadata version')
}

if (installedVersionModule.ANALYSIS_RENDERERS_VERSION !== metadata.renderer_package_version) {
  throw new Error('Installed package export ANALYSIS_RENDERERS_VERSION does not match release metadata version')
}
