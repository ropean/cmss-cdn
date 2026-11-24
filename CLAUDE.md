# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

The source of https://cdn.cmss.io (Cloudflare Pages): fonts, later js/css/images. Read
[docs/SPEC.md](docs/SPEC.md) first — URL shape `<type>/<name>/<version>/<file>`, explicit versions (no
`latest`), published versions are immutable, CORS `*`.

## Rules

- Code and comments in English. Replies in Chinese.
- **Dependencies are pinned**: exact versions in `package.json` (no `^` / `~`), `bun add -E <pkg>`; commit
  `bun.lock` and `pnpm-lock.yaml` together (`pnpm install --lockfile-only` after `bun add`).
- **Every tracked file and folder is lowercase, words joined with `-`** (`build-fonts.mjs`). Exceptions are
  listed in `scripts/check-names.mjs` (`*.md` in UPPER-KEBAB, dotfiles, `_headers`).
- Scripts are plain ESM `.mjs` (Node >= 22 and Bun both run them); no TypeScript build step.
- Fonts are built from npm, never committed. A published version never changes: to change anything, publish
  a new version (a `rev` in `catalog/fonts.json` adds `-r<rev>`).
- Run `bun run check` before committing (the pre-commit hook does). Never push unless asked.

## Commands

`bun run build | serve | check | format | lint | test`. Single test:
`node --test --test-name-pattern="<name>" tests/<file>.test.mjs`.

## Layout

`catalog/fonts.json` (what fonts exist) → `scripts/lib/fonts.mjs` (build) → `dist/fonts/<id>/<version>/`.
`public/<type>/<name>/<version>/` (hand-managed assets) → `scripts/lib/assets.mjs`. Both feed
`scripts/lib/catalog.mjs` (`index.json`). `site/index.html` is the search page. `public/_headers` is the
Cloudflare Pages header file. `scripts/lib/spec.mjs` holds the naming regexes — the one place for them.
