# cmss-cdn

Static assets served from **https://cdn.cmss.io**: web fonts now, scripts, stylesheets
and images later. The site root is a search page; `/index.json` is the machine-readable catalog.

```
https://cdn.cmss.io/<type>/<name>/<version>/<file>
https://cdn.cmss.io/fonts/manrope/5.3.0/manrope.css
```

The full URL and naming rules are in [docs/SPEC.md](docs/SPEC.md) — read it before adding anything.

## Commands

```bash
bun install             # or pnpm install (Node >= 22)
bun run build           # dist/ — fonts from the Fontsource packages + public/ + catalog + search page
pnpm dev                # build, then preview dist/ at http://localhost:5003 (CORS + cache headers like production)
bun run check           # names + lint + format + test + build (the pre-commit hook runs it)
bun run format          # oxfmt --write
pnpm favicon            # regenerate public/favicon.ico from public/favicon.svg (after editing the svg)
```

## Layout

```
catalog/fonts.json      which fonts exist: id, family, npm package, css files to merge
public/                 hand-managed assets: public/<type>/<name>/<version>/…  (js, css, images)
                        top-level files here (e.g. _headers) are copied to the site root
site/index.html         the search page
scripts/                build.mjs, serve.mjs, make-favicon.mjs, check.mjs, check-names.mjs, lib/
tests/                  node:test
docs/SPEC.md            URL / naming / versioning rules
dist/                   build output (gitignored) — the folder that gets deployed
```

Fonts are never committed: they are built from pinned Fontsource npm versions
(`devDependencies`, exact versions, both lockfiles committed).

## Deploy (Project Hub, GitHub Actions)

`.github/workflows/deploy.yml` installs, runs `bun run check` (which builds `dist/`), then publishes `dist/`
with the Project Hub deploy client (`https://pm.cmss.io/deploy.sh`, see https://pm.cmss.io/deploy.md). It
runs on:

- a **published GitHub release**,
- a **push of a branch or tag named `release*`**,
- a **manual run** (Actions → Deploy → Run workflow), which has a **branch** input (default `main`).

Two settings are needed (repository **Settings → Secrets and variables → Actions**):

| Name                     | Where     | Value                                                                    |
| ------------------------ | --------- | ------------------------------------------------------------------------ |
| `PROJECT_HUB_URL`        | Variables | The deploy URL: `https://pm.cmss.io/api/deploy`                          |
| `PROJECT_HUB_DEPLOY_KEY` | Secrets   | The project's deploy key (`phk_…`, from the project's **Deploys** card)  |

The key is the only credential: keep it as a secret, never in a commit, log or URL. Local deploy:

```bash
bun run build
PROJECT_HUB_DEPLOY_KEY=phk_... sh -c 'curl -fsSL https://pm.cmss.io/deploy.sh | sh -s -- dist https://pm.cmss.io/api/deploy'
```

Notes:

- The **deploy branch** (`BRANCH` for the hub: which environment receives the site) is `main` for every automatic
  run (release published, `release*` push). A manual run publishes to the branch typed in the `branch` input;
  any branch other than the project's production one is a preview, which only some targets accept. It is
  independent of the git ref the workflow builds from (the "Use workflow from" selector).
- Only one deploy runs at a time; a newer run waits for the running one.
- A deploy replaces the whole site, so anything that must stay reachable has to still be built
  (docs/SPEC.md, "A font upgrade").
- `public/_headers` (CORS `*`, year-long `immutable` cache for versioned files) is copied to the site root;
  it takes effect when the deploy target honours Cloudflare-style `_headers` files.
