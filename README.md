# Botland Character Studio

[![CI](https://github.com/beerAndNacho/botlandgallary/actions/workflows/ci.yml/badge.svg)](https://github.com/beerAndNacho/botlandgallary/actions/workflows/ci.yml)
[![Validate Pages](https://github.com/beerAndNacho/botlandgallary/actions/workflows/pages.yml/badge.svg)](https://github.com/beerAndNacho/botlandgallary/actions/workflows/pages.yml)

## [▶ Create a hologram character](https://beerandnacho.github.io/botlandgallary/?v=7.1.0)

## [▶ Browse the 10,000-character gallery](https://beerandnacho.github.io/botlandgallary/gallery.html?v=7.1.0)

Botland now has two connected browser experiences:

- **Character Studio homepage** — build an original cute hologram mascot by selecting its species, palette, eyes, expression, wings, accessory, element, rarity, name, and deterministic seed.
- **10,000 Gallery** — search, filter, favorite, inspect, and export a deterministic collection of 10,000 original mascots.

## Homepage creator

The creator includes:

- 12 mascot species and 8 hologram palettes
- live SVG preview
- pointer and touch 3D card tilt
- random generation and same-species variations
- reproducible seed-based designs
- browser storage for up to 24 creations
- JSON recipe copying
- original SVG and 1024×1024 PNG export
- storage fallback for restricted in-app browsers

The generated mascot always has two arms and two feet. Ears, tails, wings, horns, and decorative effects are rendered as separate non-limb traits.

## Gallery

The gallery generates exactly 10,000 stable IDs in the browser and displays 48 cards per page. It supports name or number search, species and rarity filters, deterministic sorting, favorites, card detail views, 3D pointer movement, and SVG or PNG export.

## Runtime design

The production site is served from the `gh-pages` branch. The creator loads only same-origin static HTML, CSS, and JavaScript. It does not fetch a compressed application payload or decode Base64 at runtime, avoiding the mobile in-app browser failures seen in earlier versions.

The homepage generator is a deterministic vector mascot engine. High-detail photorealistic image-model rendering would require a protected server-side image API and is not exposed from the static GitHub Pages client.

## Local development

The original TypeScript/Vite project remains available in `src/`.

```bash
npm install
npm run check
npm run build
```

## License

- Website source: [MIT](LICENSE)
- Generated Botland character outputs: free for personal and commercial use
- Inspiration notice: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
