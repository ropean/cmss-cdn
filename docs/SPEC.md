# URL and layout specification

Everything on `https://cdn.cmss.io` follows one shape:

```
https://cdn.cmss.io/<type>/<name>/<version>/<file>
```

| Type     | What                          | Example                                                                               |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `fonts`  | Web fonts (built from npm)    | `https://cdn.cmss.io/fonts/manrope/5.3.0/manrope.css`                                 |
| `js`     | Scripts / libraries           | `https://cdn.cmss.io/js/<name>/<version>/<name>.js`                                   |
| `css`    | Stylesheets                   | `https://cdn.cmss.io/css/<name>/<version>/<name>.css`                                 |
| `images` | Images, icons, other binaries | `https://cdn.cmss.io/images/<name>/<version>/<file>`                                  |

Root files: `/index.html` (search page), `/index.json` (catalog of everything), `/fonts/index.json`
(the fonts only), `/_headers` (response headers, Cloudflare-style).

## Rules

1. **`<name>`** is lowercase words joined by `-` (`noto-sans-sc`). Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`.
   For fonts it is the font's `id`, the same one a site template uses.
2. **`<version>`** is always explicit — there is **no `latest`** and no floating alias. Format:
   `MAJOR.MINOR.PATCH` with an optional `-suffix` (`5.3.0`, `5.3.0-r2`). Regex:
   `^\d+\.\d+\.\d+(-[0-9a-z]+(\.[0-9a-z]+)*)?$`.
3. **A published version never changes.** Its files are served with
   `Cache-Control: public, max-age=31536000, immutable`. To change anything — even a CSS tweak —
   publish a new version. Old versions stay, so pages that still link them keep working.
4. **File names** are lowercase, words joined by `-`, dots only before the extension
   (`manrope-latin-wght-normal.woff2`, `jquery.min.js`). Directory names follow the same rule.
5. **Everything is cross-origin.** Every file carries `Access-Control-Allow-Origin: *` (fonts do not
   load cross-origin without it).
6. **Only paths under these types are public.** Anything else is not served.

## Fonts

- `fonts/<id>/<version>/<id>.css` — all `@font-face` rules of the family in one stylesheet (weight axis
  and italics merged). `<version>` is the Fontsource package version; if the build rules change while the
  package stays, add a revision suffix: `5.3.0-r2` (`"rev": 2` in `catalog/fonts.json`).
- `fonts/<id>/<version>/files/<file>.woff2` — the font files the stylesheet points at, via relative
  `url(files/<file>.woff2)`.
- The stylesheet declares `font-family` by the plain family name (`Manrope`, not Fontsource's
  `Manrope Variable`), keeps woff2 only, and keeps `font-display: swap` and `unicode-range` subsets
  (the browser downloads only the subsets a page uses).
- Usage:

  ```html
  <link rel="stylesheet" href="https://cdn.cmss.io/fonts/manrope/5.3.0/manrope.css" />
  ```

  ```css
  font-family: "Manrope", sans-serif;
  ```

- Source of truth for what exists: `catalog/fonts.json` (`id`, `family`, `pkg`, `css`). Fonts are
  SIL OFL 1.1.

## js / css / images

Hand-managed. Put files in `public/<type>/<name>/<version>/…`; the build copies them unchanged and lists
them in the catalog. Entry file of a script or stylesheet: `<name>.js` / `<name>.min.js` /
`<name>.css` (the first that exists is the catalog's `entry`).

## Catalog: `/index.json`

```json
{
  "version": 1,
  "base": "https://cdn.cmss.io",
  "items": [
    {
      "type": "fonts",
      "name": "manrope",
      "version": "5.3.0",
      "title": "Manrope",
      "entry": "fonts/manrope/5.3.0/manrope.css",
      "url": "https://cdn.cmss.io/fonts/manrope/5.3.0/manrope.css",
      "files": 23,
      "bytes": 123456,
      "license": "OFL-1.1"
    }
  ]
}
```

- `entry` is the path from the site root; `url` is `base` + `/` + `entry`.
- `files` / `bytes` count every file of that version.
- Non-font items list their files in `fileList` (relative to the version directory).
- Sorted by `type`, `name`, then `version`. No timestamps: the same inputs give the same output.

`/fonts/index.json` has the same shape with `items` limited to fonts.

## Adding things

- **A font**: `bun add -E @fontsource-variable/<name>` (or `@fontsource/<name>`), add an entry to
  `catalog/fonts.json`, `bun run build`, `bun run check`, commit, deploy.
- **A font upgrade**: bump the package version (exact). The font then publishes under the new version.
  A deploy replaces the whole site, so an old version survives only if it is
  still built: keep it by installing the old release under an npm alias
  (`bun add -E manrope-5-3-0@npm:@fontsource-variable/manrope@5.3.0`) and keeping a second
  `catalog/fonts.json` entry with the same `id` and `"pkg": "manrope-5-3-0"`. Entries are unique by
  (`id`, resolved version).
- **A script / stylesheet / image**: add `public/<type>/<name>/<version>/…`, `bun run check`, commit.
