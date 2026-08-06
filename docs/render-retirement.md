# Archived Render deployment

This is the sanitized deployment snapshot captured on **2026-08-06** from the Render workspace `caii`, before any retirement action. It is the rebuild reference for the `aoi-canary` Render resource.

## Disposition at capture

- Resource: `aoi-canary`
- Inventory decision: suspend, then deactivate
- Render state before this documentation pass: `not_suspended`
- Inventory cost: `$0/month` (static site)
- This documentation change did not suspend or delete the resource.

## Static site: `aoi-canary`

| Setting | Captured live value |
| --- | --- |
| Render ID | `srv-d6qvqh7afjfc73eugnc0` |
| Type | `static_site` |
| Repository | `https://github.com/yauhenio2025/aoi-canary` |
| Branch | `main` |
| Root directory | Repository root |
| Suspension state | `not_suspended` |
| Auto deploy | `yes`; trigger `commit` |
| Build plan | `performance` |
| Build command | `npm install && npm run build` |
| Publish path | `dist` |
| Pull-request previews | `no`; preview generation `off` |
| Public URL | `https://aoi-canary.onrender.com` |
| Dashboard | `https://dashboard.render.com/static/srv-d6qvqh7afjfc73eugnc0` |
| IP allow list | `0.0.0.0/0` (`everywhere`) |
| Plan, runtime, region, instances | Not returned for this static site |
| Health check and open ports | Not returned for this static site |

Current live deployment at capture:

| Setting | Value |
| --- | --- |
| Deploy ID | `dep-d9ph3f0ae00c73f2d9n0` |
| Commit | `25a19ef901be88f70a835511b965f5d2168e9b8d` |
| Status | `live` |
| Trigger | `api` |
| Started | `2026-08-05T10:34:36.437375Z` |
| Finished | `2026-08-05T10:34:54.080596Z` |

## Configuration names

Environment-variable names present in Render:

- `VITE_ANALYZER_V2_URL`
- `VITE_AOI_JOB_ID`
- `VITE_AOI_MODE`

Values are intentionally omitted. No secret files were configured.

## Domains, routing, and headers

- Custom domains: none
- Redirect/rewrite routes: none
- Custom response headers: none

## Storage and data-safety limits

No Render persistent disk was attached to this target resource. This record captures deployment configuration and environment-variable/secret-file names only; it does **not** contain secret values or application data and is not a backup.

Before deleting any related PostgreSQL resource, export its data separately. A paid Starter key-value resource retains state while suspended, but deleting it is irreversible. Neither resource type is part of this repository's captured target.

## Rebuild outline

1. Create a Render static site in workspace `caii` from this repository and branch.
2. Apply the root directory, build command, and publish path above.
3. Re-create the listed environment variables with values from an approved secret store.
4. Apply the network and preview settings, deploy the recorded commit if exact reproduction is required, and verify the public URL behavior.
