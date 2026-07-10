# AOI Canary

Thin consumer canary for the analyzer-v2 Anxiety of Influence Neurath proof.

This app is intentionally narrow:

- it renders the pinned `aoi-canary` AOI Neurath artifacts first
- it can switch to live analyzer result-contract fetches against analyzer-v2
- it hosts only a generic local `TabShell`
- it relies on the shared `@the-syllabus/analysis-renderers` package for child views
- it does not perform AOI-specific grouping, provenance reconstruction, or semantic joins

## Modes

- `artifact`
  - default mode
  - renders the frozen Neurath `page_slim.json` checked into `src/fixtures/`
- `live`
  - discovery-first, result-backed live mode over analyzer `results` routes using `consumer_key=aoi-canary`
  - uses `result_discovery -> result_manifest -> result_presentation`
  - keeps presenter `trace/status` only as secondary debug aids
  - never silently falls back to artifact content when live discovery or result fetches fail

## Environment

Optional variables:

```bash
VITE_ANALYZER_V2_URL=http://localhost:8000
VITE_AOI_PROJECT_ID=project-aoi-proof
VITE_AOI_WORKFLOW_KEY=anxiety_of_influence_thematic_single_thinker
VITE_AOI_JOB_ID=job-abe51e9f629f
VITE_AOI_MODE=artifact
```

If `VITE_ANALYZER_V2_URL` is omitted, live mode falls back to the current origin.

Notes:

- `VITE_AOI_PROJECT_ID` is required for discovery-first live mode
- `VITE_AOI_WORKFLOW_KEY` defaults to `anxiety_of_influence_thematic_single_thinker`
- `VITE_AOI_JOB_ID` is debug-only; if set, live mode bypasses discovery and still uses manifest-first fetch order

## URL Overrides

For bounded debugging, live discovery scope can be overridden via URL params:

```text
?project_id=project-aoi-proof&workflow_key=anxiety_of_influence_thematic_single_thinker
```

These override env defaults for discovery, but Tier A acceptance still counts only the AOI workflow proof path.

## Renderer Boundary

Local app code is allowed to do only this:

- render the root `tab` container
- dispatch child views by `renderer_type`
- pass `structured_data ?? items ?? raw_prose` and `renderer_config` into the shared renderers
- expose unsupported renderer fallback visibly

The app must not:

- regroup findings by sin type
- infer provenance from titles
- rewrite AOI view semantics
- import code from `the-critic` or `analyzer-mgmt`

## Development

```bash
npm install
npm run lint
npm run test -- --run
npm run build
```

## Shared Renderer Package

The canary consumes a vendored tarball snapshot of `@the-syllabus/analysis-renderers`.

Detailed release steps live in [`docs/renderer-release-workflow.md`](./docs/renderer-release-workflow.md).

Supported workflow:

1. In `analyzer-v2/renderers-ui`, bump the package version and run:

```bash
npm run release:pack
```

2. In `aoi-canary`, sync the produced tarball:

```bash
npm run sync:renderer -- /absolute/path/to/the-syllabus-analysis-renderers-X.Y.Z.tgz
```

3. Build and verify:

```bash
npm run build
```

4. After deploy, verify the blessed production site:

```bash
npm run verify:live-renderer-build
```

Important rules:

- same-version tarballs are rejected on sync
- the canary keeps exactly one active renderer tarball in `vendor/`
- the build fails if installed package/version/hash drift from vendored metadata
- post-deploy verification uses `https://aoi-canary.onrender.com/renderer-build.json`

The app imports the shared renderer stylesheet via `@the-syllabus/analysis-renderers/styles`.
It uses `DesignTokenProvider` with fallback tokens only. It does not fetch live style-school tokens in v1.
