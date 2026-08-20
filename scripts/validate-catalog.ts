import { BOT_COUNT, PALETTES, catalogStats, createBotSpec, createCatalog, renderBotSvg } from "../src/bot-engine.ts";

const catalog = createCatalog();
const stats = catalogStats(catalog);

if (stats.count !== BOT_COUNT) throw new Error(`expected ${BOT_COUNT} bots, got ${stats.count}`);
if (stats.uniqueCoreSignatures !== BOT_COUNT) {
  throw new Error(`expected ${BOT_COUNT} unique core signatures, got ${stats.uniqueCoreSignatures}`);
}
if (stats.palettes !== PALETTES.length) {
  throw new Error(`expected all ${PALETTES.length} palettes to be used, got ${stats.palettes}`);
}

const deterministicA = JSON.stringify(createBotSpec(4242));
const deterministicB = JSON.stringify(createBotSpec(4242));
if (deterministicA !== deterministicB) throw new Error("catalog generation is not deterministic");

for (const id of [0, 1, 999, 4242, BOT_COUNT - 1]) {
  const svg = renderBotSvg(catalog[id]!);
  if (!svg.startsWith("<svg") || !svg.includes("</svg>")) throw new Error(`invalid SVG for id ${id}`);
}

const totalRarity = Object.values(stats.rarity).reduce((sum, count) => sum + count, 0);
if (totalRarity !== BOT_COUNT) throw new Error("rarity distribution does not cover the catalog");

console.log("Botland catalog validation passed", stats);
