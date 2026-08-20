# Botland Gallery

[![CI](https://github.com/beerAndNacho/botlandgallary/actions/workflows/ci.yml/badge.svg)](https://github.com/beerAndNacho/botlandgallary/actions/workflows/ci.yml)
[![Publish Botland Gallery](https://github.com/beerAndNacho/botlandgallary/actions/workflows/pages.yml/badge.svg)](https://github.com/beerAndNacho/botlandgallary/actions/workflows/pages.yml)

> **Live gallery:** [https://beerandnacho.github.io/botlandgallary/](https://beerandnacho.github.io/botlandgallary/)

A static gallery that deterministically generates **10,000 original pixel robots** in the browser. The project takes inspiration from the layered-parts idea in [shevenionov/botlab](https://github.com/shevenionov/botlab), while using a new rendering engine, new shapes, new palettes, and a gallery-first interface.

## What is included

- Exactly 10,000 catalog entries with 10,000 distinct core signatures
- 12 bodies, 16 heads, 12 eye systems, 14 top modules, 10 mouths, and 10 side modules in the main Vite app
- 24 palettes across 8 color families in the main Vite app
- Search by serial, Korean name, palette, part, mood, and rarity
- Body, color, mood, rarity, favorites, and sort filters
- Persistent browser favorites
- Detail links such as `#bot-04243`
- 1024×1024 PNG and original SVG downloads
- Responsive light/dark UI with reduced-motion support
- Catalog validation in CI
- Automatic publication to the `gh-pages` branch
- A dependency-free, single-file edition at [`standalone/index.html`](standalone/index.html)

## Why there are not 10,000 image files

Every bot is reconstructed from its numeric ID. A coprime permutation maps each ID to a unique body/head/eye/top signature, while a stable 32-bit hash supplies the remaining visual traits. This keeps the repository small, makes every result reproducible, and still produces the full 10,000-item collection.

The validation script checks:

1. The catalog contains exactly 10,000 entries.
2. All 10,000 core signatures are unique.
3. Every palette is represented.
4. Repeated generation from the same ID is deterministic.
5. Representative bots produce valid SVG documents.

## Run locally

Requires Node.js 22.12+ or Node.js 24.

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Open the standalone edition

The standalone edition contains its CSS, catalog generator, SVG renderer, filters, favorites, detail dialog, and download tools in one HTML file.

```bash
python3 -m http.server 8000 --directory standalone
```

Then open `http://localhost:8000`.

## Validate and build

```bash
npm run check
npm run build
npm run preview
```

## Deployment

The repository uses two branches for publication:

- `main`: application source and the canonical standalone gallery
- `gh-pages`: deployable `index.html`, `404.html`, `.nojekyll`, and deployment health metadata

A push to `main` runs `.github/workflows/pages.yml`, refreshes `gh-pages`, requests a Pages build, and verifies the public gallery before recording success.

Official address: `https://beerandnacho.github.io/botlandgallary/`

## Project structure

```text
src/bot-engine.ts       deterministic catalog + SVG renderer
src/main.ts             gallery state, search, filters, dialog, downloads
src/styles.css          responsive visual system
scripts/validate-catalog.ts
standalone/index.html   dependency-free single-file gallery
.github/workflows/ci.yml
.github/workflows/pages.yml
```

## License

- Website source: [MIT](LICENSE)
- Generated Botland robot outputs: free for personal and commercial use
- Inspiration notice: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
