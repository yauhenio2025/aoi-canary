# Renderer Release Workflow

This is the only supported path for shipping `@the-syllabus/analysis-renderers` changes into `aoi-canary`.

## 1. Bump the renderer package version

In `/home/evgeny/projects/analyzer-v2/renderers-ui/package.json`:

- increment the package version
- do not reuse an existing version for a new tarball

## 2. Produce the release tarball

From `/home/evgeny/projects/analyzer-v2/renderers-ui`:

```bash
npm run release:pack
```

This script:

- validates package identity
- builds the package
- generates `src/generated/version.ts`
- writes the tarball into `release-artifacts/`
- computes the tarball SHA-256
- refuses to overwrite an existing tarball for the same version

## 3. Sync the canary to the new tarball

From `/home/evgeny/projects/aoi-canary`:

```bash
npm run sync:renderer -- /absolute/path/to/the-syllabus-analysis-renderers-X.Y.Z.tgz
```

This script:

- validates package identity
- rejects same-version refreshes
- copies the tarball into `vendor/`
- removes older renderer tarballs from `vendor/`
- updates `package.json`
- refreshes `package-lock.json`
- clears `node_modules/@the-syllabus`
- reinstalls dependencies
- writes `vendor/renderer-release.json`

## 4. Verify locally

From `/home/evgeny/projects/aoi-canary`:

```bash
npm run test
npm run lint
npm run type-check
npm run build
```

The canary build path enforces:

- vendored tarball exists
- package name/version match
- `ANALYSIS_RENDERERS_VERSION` matches the vendored version
- tarball SHA-256 matches `vendor/renderer-release.json`
- `dist/renderer-build.json` is generated and consistent

## 5. Verify the blessed production site

After deploy, from `/home/evgeny/projects/aoi-canary`:

```bash
npm run verify:live-renderer-build
```

This verifies the exact blessed production URL:

- `https://aoi-canary.onrender.com/renderer-build.json`

The release is not trustworthy until the live metadata matches the intended:

- package name
- package version
- tarball filename
- tarball SHA-256

## Process boundary

- CSS-only design passes must not silently alter renderer TS/JS outside the agreed file list.
- Renderer logic changes and styling changes should be called out separately in the release note or handoff.
