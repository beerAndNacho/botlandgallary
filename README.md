# Botland Gallery

[![CI](https://github.com/beerAndNacho/botlandgallary/actions/workflows/ci.yml/badge.svg)](https://github.com/beerAndNacho/botlandgallary/actions/workflows/ci.yml)
[![Deploy Botland 3D Gallery](https://github.com/beerAndNacho/botlandgallary/actions/workflows/pages.yml/badge.svg)](https://github.com/beerAndNacho/botlandgallary/actions/workflows/pages.yml)

## [▶ Open Botland Gallery](https://beerandnacho.github.io/botlandgallary/?v=6)

**Public URL:** https://beerandnacho.github.io/botlandgallary/

Botland Gallery is a deterministic collection of **10,000 original hologram characters**. Version 6 turns every gallery card into an interactive 3D object and expands the character generator with deeper silhouettes, layered accessories, expressions, emblems, companions, energy effects, and lore traits.

## Version 6 highlights

- Pointer-responsive 3D tilt on desktop
- Touch-drag 3D tilt on phones and tablets
- Five independent parallax layers: background, aura, character, companion, and foreground
- Adjustable 3D strength from 0° to 18°
- 18 body frames and 96 character species across 12 archetypes
- Deterministic pose, expression, emblem, companion, energy style, equipment, origin, ability, and aura
- Animated hologram glare, spectral sheen, scan lines, RGB separation, particles, and depth shadows
- Detail-card swiping, previous/next navigation, favorites, search, filters, backup/restore, SVG export, and PNG export
- Exactly 10,000 reproducible character IDs
- No runtime `fetch`, Base64 decoding, decompression, or service-worker dependency
- Self-contained application HTML for reliable mobile in-app browser support

## 3D interaction

Move the pointer across a card, or press and drag a card on a touch screen. The card rotates in perspective while its hologram layers move by different amounts. Releasing the card returns it smoothly to its resting position. The same interaction is available in the character detail view.

The **Settings → 3D strength** control changes the maximum rotation angle. Reduced-motion preferences and the animation toggle disable motion automatically.

## Character generation

Every ID reconstructs the same character from a stable 32-bit seed. The generator combines:

- 12 archetypes and 96 species
- 18 body frames
- eyes, top equipment, side equipment, finish, palette, element, and rarity
- pose, expression, emblem, companion, and energy style
- origin, ability, aura, title, name, and lore

This design stores generation rules instead of 10,000 individual image files, keeping the repository compact while preserving the full catalog.

## Deployment

The production source is stored as checksum-verified compressed parts under `.holo-upgrade/v6-3d/`. The Pages workflow joins and decompresses those parts **during deployment**, validates the 3D and character-generation features, checks the inline JavaScript syntax, and publishes a self-contained page to `gh-pages`.

The browser receives the finished HTML directly. It does not fetch or decode a secondary application payload.

## Local development

The original TypeScript/Vite implementation remains available in `src/`. The deployed v6 single-file edition can be reconstructed with the same commands used in `.github/workflows/pages.yml`.

```bash
npm install
npm run check
npm run build
```

## License

- Website source: [MIT](LICENSE)
- Generated Botland character outputs: free for personal and commercial use
- Inspiration notice: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
