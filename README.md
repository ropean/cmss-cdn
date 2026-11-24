# cmss-cdn

Static assets served from **https://cdn.cmss.io** (Cloudflare Pages): web fonts now, scripts, stylesheets
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
bun run serve [port]    # preview dist/ at http://localhost:8787 (CORS + cache headers like production)
bun run check           # names + lint + format + test + build (the pre-commit hook runs it)
bun run format          # oxfmt --write
```

## Layout

```
catalog/fonts.json      which fonts exist: id, family, npm package, css files to merge
public/                 hand-managed assets: public/<type>/<name>/<version>/…  (js, css, images)
                        top-level files here (e.g. _headers) are copied to the site root
site/index.html         the search page
scripts/                build.mjs, serve.mjs, check.mjs, check-names.mjs, lib/
tests/                  node:test
docs/SPEC.md            URL / naming / versioning rules
dist/                   build output (gitignored) — the Cloudflare Pages output directory
```

Fonts are never committed: they are built from pinned Fontsource npm versions
(`devDependencies`, exact versions, both lockfiles committed).

## Deploy (Cloudflare Pages)

| Setting                | Value                                               |
| ---------------------- | --------------------------------------------------- |
| Framework preset       | None                                                |
| Build command          | `npm install -g bun && bun install && bun run build` (or `npm i && npm run build`) |
| Build output directory | `dist`                                              |
| Node version           | 22 or newer (`NODE_VERSION` environment variable)   |
| Custom domain          | `cdn.cmss.io`                                       |

`dist/_headers` sets `Access-Control-Allow-Origin: *` and the year-long `immutable` cache for versioned
files; `dist/index.html` and the two `index.json` files always revalidate. Cloudflare Pages replaces the
whole site on each deploy, so anything that must stay reachable has to still be built (see docs/SPEC.md,
"A font upgrade"). Nothing here deploys automatically; connect the repository in the Cloudflare dashboard
(or `wrangler pages deploy dist`) when ready.
