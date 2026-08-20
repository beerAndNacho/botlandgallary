export const BOT_COUNT = 10_000;

export const BODY_NAMES = [
  "크레이트",
  "트랙",
  "호버",
  "스트라이더",
  "캡슐",
  "드럼",
  "스카우트",
  "포지",
  "스피더",
  "오브",
  "워크벤치",
  "메카",
] as const;

export const HEAD_NAMES = [
  "큐브",
  "돔",
  "CRT",
  "웨지",
  "파일",
  "캣",
  "하운드",
  "베어",
  "오브",
  "모니터",
  "피라미드",
  "버블",
  "바이저",
  "나이트",
  "스컬",
  "젤리",
] as const;

export const EYE_NAMES = [
  "도트",
  "블록",
  "바이저",
  "사이클롭스",
  "슬립",
  "스캔",
  "트라이",
  "크로스",
  "링",
  "픽셀",
  "웨이브",
  "글로우",
] as const;

export const TOP_NAMES = [
  "안테나",
  "혼",
  "비콘",
  "핀",
  "위성",
  "프로펠러",
  "크라운",
  "솔라",
  "이어",
  "헤일로",
  "모호크",
  "레이더",
  "스택",
  "클린",
] as const;

export const MOUTH_NAMES = [
  "그릴",
  "라인",
  "스마일",
  "스피커",
  "제로",
  "펄스",
  "팽",
  "메시",
  "노치",
  "포트",
] as const;

export const SIDE_NAMES = [
  "암",
  "클로",
  "실드",
  "툴",
  "윙",
  "탱크",
  "코일",
  "블레이드",
  "포드",
  "미니멀",
] as const;

export const MOOD_NAMES = [
  "차분",
  "호기심",
  "용감",
  "장난기",
  "집중",
  "졸림",
  "경계",
  "명랑",
] as const;

export const COLOR_FAMILIES = [
  "코발트",
  "민트",
  "앰버",
  "마젠타",
  "라임",
  "코랄",
  "바이올렛",
  "실버",
] as const;

export const RARITY_NAMES = ["커먼", "언커먼", "레어", "에픽", "레전더리"] as const;

export type Rarity = (typeof RARITY_NAMES)[number];

export type BotSpec = {
  id: number;
  serial: string;
  name: string;
  seed: number;
  body: number;
  head: number;
  eyes: number;
  top: number;
  mouth: number;
  side: number;
  palette: number;
  pattern: number;
  background: number;
  mood: number;
  rarity: Rarity;
  rarityRank: number;
  colorFamily: number;
  coreSignature: string;
  tags: string[];
};

type Palette = {
  name: string;
  family: number;
  bg: string;
  bgAlt: string;
  ink: string;
  surface: string;
  shade: string;
  panel: string;
  accent: string;
  glow: string;
};

export const PALETTES: readonly Palette[] = [
  { name: "Deep Current", family: 0, bg: "#071827", bgAlt: "#0d2a42", ink: "#06101a", surface: "#2d7fc7", shade: "#18558f", panel: "#b9e8ff", accent: "#ff8b59", glow: "#69f2ff" },
  { name: "Signal Blue", family: 0, bg: "#0d1533", bgAlt: "#1c2a62", ink: "#090d1d", surface: "#4c63e8", shade: "#2c3aa2", panel: "#d9e2ff", accent: "#ffc857", glow: "#73f0ff" },
  { name: "Arctic Relay", family: 0, bg: "#e9f6ff", bgAlt: "#cbe9fb", ink: "#163044", surface: "#5ba8d8", shade: "#2f719a", panel: "#f9fdff", accent: "#ff6f61", glow: "#dffbff" },
  { name: "Mint Circuit", family: 1, bg: "#08241f", bgAlt: "#0c3b32", ink: "#051511", surface: "#34b99a", shade: "#1b7f68", panel: "#c7f7e8", accent: "#ffcb66", glow: "#7bffd9" },
  { name: "Sea Glass", family: 1, bg: "#dff8ef", bgAlt: "#b9ead8", ink: "#19392f", surface: "#67c7a9", shade: "#3c9278", panel: "#f7fffc", accent: "#ef6f6c", glow: "#d5fff1" },
  { name: "Tidal Neon", family: 1, bg: "#071d25", bgAlt: "#0a3440", ink: "#041116", surface: "#0bb8a7", shade: "#08766d", panel: "#aaf8ec", accent: "#ff4f9a", glow: "#6effe9" },
  { name: "Amber Forge", family: 2, bg: "#241405", bgAlt: "#4a2b09", ink: "#160c03", surface: "#d98a22", shade: "#9f5c10", panel: "#ffe3a6", accent: "#2cc9b6", glow: "#fff07a" },
  { name: "Solar Dust", family: 2, bg: "#fff0c7", bgAlt: "#ffd584", ink: "#422b0c", surface: "#ed9a2f", shade: "#b66a12", panel: "#fff9e7", accent: "#6c5ce7", glow: "#fff3a6" },
  { name: "Copper Signal", family: 2, bg: "#271610", bgAlt: "#4e2c20", ink: "#160b07", surface: "#c8794d", shade: "#8e4b2c", panel: "#f2d6bd", accent: "#4fd1c5", glow: "#ffd166" },
  { name: "Magenta Core", family: 3, bg: "#25091e", bgAlt: "#4c123f", ink: "#160611", surface: "#d33d98", shade: "#92236a", panel: "#ffd4ef", accent: "#51d6ff", glow: "#ff8bd7" },
  { name: "Sakura Byte", family: 3, bg: "#fff0f7", bgAlt: "#fac9df", ink: "#3d1f31", surface: "#e77caf", shade: "#b84e82", panel: "#fffafd", accent: "#4d9de0", glow: "#ffe279" },
  { name: "Plasma Rose", family: 3, bg: "#13071f", bgAlt: "#2f0e4b", ink: "#09030e", surface: "#b43bed", shade: "#70219a", panel: "#edd1ff", accent: "#ff5a7a", glow: "#ff81f3" },
  { name: "Lime Terminal", family: 4, bg: "#101d05", bgAlt: "#263e0a", ink: "#091003", surface: "#80bd20", shade: "#4f7c10", panel: "#e5ffb8", accent: "#ff7b54", glow: "#caff70" },
  { name: "Game Matrix", family: 4, bg: "#0f380f", bgAlt: "#306230", ink: "#081d08", surface: "#8bac0f", shade: "#306230", panel: "#9bbc0f", accent: "#c8e35d", glow: "#e0f8d0" },
  { name: "Acid Meadow", family: 4, bg: "#efffd5", bgAlt: "#c9ef86", ink: "#294213", surface: "#8fc93a", shade: "#5b8d1d", panel: "#fbfff5", accent: "#6741d9", glow: "#e2ff91" },
  { name: "Coral Workshop", family: 5, bg: "#2b1010", bgAlt: "#56201f", ink: "#180808", surface: "#df6558", shade: "#9f3d37", panel: "#ffd8cd", accent: "#44c7b0", glow: "#ffb08a" },
  { name: "Peach Module", family: 5, bg: "#fff0e5", bgAlt: "#ffcbb7", ink: "#49281f", surface: "#f08a72", shade: "#ba5f4d", panel: "#fffaf7", accent: "#3f8efc", glow: "#ffd2a8" },
  { name: "Red Alert", family: 5, bg: "#21090b", bgAlt: "#491117", ink: "#110405", surface: "#c93645", shade: "#8e1e2c", panel: "#ffd0d5", accent: "#ffcb45", glow: "#ff6b75" },
  { name: "Violet Orbit", family: 6, bg: "#140c2f", bgAlt: "#2c1c61", ink: "#0b061b", surface: "#7255d9", shade: "#49349d", panel: "#e2dbff", accent: "#f7b32b", glow: "#b39cff" },
  { name: "Lavender Lab", family: 6, bg: "#f1edff", bgAlt: "#d3c8ff", ink: "#30284f", surface: "#8d79d6", shade: "#5d4e9e", panel: "#fffefe", accent: "#ef5da8", glow: "#eee6ff" },
  { name: "Ultraviolet", family: 6, bg: "#0c0618", bgAlt: "#21113e", ink: "#05020a", surface: "#6f2dbd", shade: "#461878", panel: "#dcc4ff", accent: "#00d9c0", glow: "#b85cff" },
  { name: "Moon Alloy", family: 7, bg: "#10151d", bgAlt: "#26303c", ink: "#080b0f", surface: "#8c98a5", shade: "#5c6670", panel: "#eef2f7", accent: "#ff6b35", glow: "#bcecff" },
  { name: "Paper Chrome", family: 7, bg: "#edf1f5", bgAlt: "#cbd4dd", ink: "#27313a", surface: "#9ca8b3", shade: "#6c7782", panel: "#ffffff", accent: "#1a9f8c", glow: "#f6ff9a" },
  { name: "Stealth Alloy", family: 7, bg: "#080a0e", bgAlt: "#181d26", ink: "#020306", surface: "#353c48", shade: "#20252e", panel: "#697483", accent: "#ff315f", glow: "#21dfff" },
] as const;

const ADJECTIVES = [
  "빛나는", "고요한", "민첩한", "따뜻한", "기민한", "용감한", "장난스런", "정교한", "느긋한", "단단한",
  "푸른", "황금빛", "작은", "은밀한", "반짝이는", "호기심 많은", "씩씩한", "부드러운", "빠른", "낙천적인",
] as const;

const NOUNS = [
  "정찰자", "수리공", "항해사", "정원사", "기록관", "탐험가", "우편부", "연구원", "경비원", "조종사",
  "관측자", "연주자", "요리사", "설계자", "수집가", "메신저", "지도사", "채굴자", "등대지기", "친구",
] as const;

const BODY_COUNT = BODY_NAMES.length;
const HEAD_COUNT = HEAD_NAMES.length;
const EYE_COUNT = EYE_NAMES.length;
const TOP_COUNT = TOP_NAMES.length;
const CORE_SPACE = BODY_COUNT * HEAD_COUNT * EYE_COUNT * TOP_COUNT;

function hash32(input: number): number {
  let x = input >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function pick(hash: number, shift: number, count: number): number {
  return hash32(hash + Math.imul(shift + 1, 0x9e3779b9)) % count;
}

function rarityFromHash(hash: number): { name: Rarity; rank: number } {
  const roll = hash % 10_000;
  if (roll < 50) return { name: "레전더리", rank: 4 };
  if (roll < 300) return { name: "에픽", rank: 3 };
  if (roll < 1_200) return { name: "레어", rank: 2 };
  if (roll < 3_800) return { name: "언커먼", rank: 1 };
  return { name: "커먼", rank: 0 };
}

export function createBotSpec(id: number): BotSpec {
  if (!Number.isInteger(id) || id < 0 || id >= BOT_COUNT) {
    throw new RangeError(`bot id must be an integer from 0 to ${BOT_COUNT - 1}`);
  }

  // 7,919 is coprime with 32,256, so the first 10,000 IDs map to distinct
  // body/head/eye/top combinations instead of relying on random uniqueness.
  let core = (Math.imul(id, 7_919) + 6_281) % CORE_SPACE;
  const body = core % BODY_COUNT;
  core = Math.floor(core / BODY_COUNT);
  const head = core % HEAD_COUNT;
  core = Math.floor(core / HEAD_COUNT);
  const eyes = core % EYE_COUNT;
  core = Math.floor(core / EYE_COUNT);
  const top = core % TOP_COUNT;

  const seed = hash32(id + 0x1f2e3d4c);
  const palette = pick(seed, 0, PALETTES.length);
  const mouth = pick(seed, 1, MOUTH_NAMES.length);
  const side = pick(seed, 2, SIDE_NAMES.length);
  const pattern = pick(seed, 3, 8);
  const background = pick(seed, 4, 12);
  const mood = pick(seed, 5, MOOD_NAMES.length);
  const rarity = rarityFromHash(hash32(seed ^ 0xa5a5a5a5));
  const serial = `BL-${String(id + 1).padStart(5, "0")}`;
  const adjective = ADJECTIVES[pick(seed, 6, ADJECTIVES.length)]!;
  const noun = NOUNS[pick(seed, 7, NOUNS.length)]!;
  const name = `${adjective} ${noun}`;
  const paletteSpec = PALETTES[palette]!;
  const colorFamily = paletteSpec.family;
  const coreSignature = `${body}-${head}-${eyes}-${top}`;

  return {
    id,
    serial,
    name,
    seed,
    body,
    head,
    eyes,
    top,
    mouth,
    side,
    palette,
    pattern,
    background,
    mood,
    rarity: rarity.name,
    rarityRank: rarity.rank,
    colorFamily,
    coreSignature,
    tags: [
      BODY_NAMES[body]!,
      HEAD_NAMES[head]!,
      EYE_NAMES[eyes]!,
      TOP_NAMES[top]!,
      MOUTH_NAMES[mouth]!,
      SIDE_NAMES[side]!,
      MOOD_NAMES[mood]!,
      COLOR_FAMILIES[colorFamily]!,
      paletteSpec.name,
      rarity.name,
    ],
  };
}

let catalogCache: BotSpec[] | undefined;

export function createCatalog(): BotSpec[] {
  if (!catalogCache) {
    catalogCache = Array.from({ length: BOT_COUNT }, (_, id) => createBotSpec(id));
  }
  return catalogCache;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rect(x: number, y: number, width: number, height: number, fill: string, extra = ""): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${extra}/>`;
}

function pixel(x: number, y: number, fill: string, size = 1): string {
  return rect(x, y, size, size, fill);
}

function backgroundSvg(bot: BotSpec, p: Palette): string {
  const b = bot.background;
  const out = [rect(0, 0, 32, 32, p.bg)];
  if (b === 0) {
    out.push(`<circle cx="16" cy="15" r="11" fill="${p.bgAlt}"/>`);
  } else if (b === 1) {
    out.push(rect(0, 21, 32, 11, p.bgAlt));
    out.push(rect(0, 19, 32, 1, p.accent, ` opacity="0.55"`));
  } else if (b === 2) {
    for (let i = -8; i < 40; i += 7) out.push(`<path d="M${i} 32L${i + 17} 0H${i + 21}L${i + 4} 32Z" fill="${p.bgAlt}" opacity="0.72"/>`);
  } else if (b === 3) {
    for (let x = 2; x < 32; x += 6) for (let y = 2; y < 32; y += 6) out.push(pixel(x, y, p.bgAlt));
  } else if (b === 4) {
    out.push(`<circle cx="4" cy="6" r="7" fill="${p.bgAlt}"/>`, `<circle cx="28" cy="25" r="9" fill="${p.bgAlt}"/>`);
  } else if (b === 5) {
    for (let r = 5; r < 17; r += 4) out.push(`<circle cx="16" cy="16" r="${r}" fill="none" stroke="${p.bgAlt}" stroke-width="1"/>`);
  } else if (b === 6) {
    out.push(`<path d="M0 7H32M0 14H32M0 21H32M0 28H32" stroke="${p.bgAlt}" stroke-width="1"/>`);
  } else if (b === 7) {
    out.push(`<path d="M16 0L32 16L16 32L0 16Z" fill="${p.bgAlt}"/>`);
  } else if (b === 8) {
    out.push(`<path d="M0 25L8 17L14 23L22 11L32 21V32H0Z" fill="${p.bgAlt}"/>`);
  } else if (b === 9) {
    out.push(`<circle cx="16" cy="16" r="13" fill="none" stroke="${p.bgAlt}" stroke-width="3" stroke-dasharray="2 2"/>`);
  } else if (b === 10) {
    out.push(`<path d="M0 0H15V15H0ZM17 17H32V32H17Z" fill="${p.bgAlt}"/>`);
  } else {
    out.push(`<path d="M0 4L32 0V8L0 12ZM0 20L32 16V24L0 28Z" fill="${p.bgAlt}"/>`);
  }
  out.push(`<ellipse cx="16" cy="28.5" rx="9.5" ry="1.5" fill="${p.ink}" opacity="0.28"/>`);
  return out.join("");
}

function rearSideSvg(bot: BotSpec, p: Palette): string {
  switch (bot.side) {
    case 0:
      return `${rect(3, 19, 4, 2, p.ink)}${rect(2, 20, 2, 6, p.surface)}${rect(28, 20, 2, 6, p.surface)}${rect(28, 19, 1, 2, p.ink)}`;
    case 1:
      return `<path d="M7 20H3V23H1V27H4V24H7ZM25 20H29V23H31V27H28V24H25Z" fill="${p.accent}" stroke="${p.ink}" stroke-width="1"/>`;
    case 2:
      return `${rect(2, 18, 5, 9, p.shade)}${rect(25, 18, 5, 9, p.shade)}${rect(3, 19, 3, 7, p.panel)}${rect(26, 19, 3, 7, p.panel)}`;
    case 3:
      return `<path d="M7 20H3V25H1V27H5V24H7ZM25 20H29V23H31V26H27V24H25Z" fill="${p.surface}" stroke="${p.ink}" stroke-width="1"/>`;
    case 4:
      return `<path d="M8 18L1 14V22L8 24ZM24 18L31 14V22L24 24Z" fill="${p.accent}" stroke="${p.ink}" stroke-width="1"/>`;
    case 5:
      return `${rect(2, 19, 5, 7, p.shade)}${rect(25, 19, 5, 7, p.shade)}${rect(3, 20, 3, 2, p.glow)}${rect(26, 20, 3, 2, p.glow)}`;
    case 6:
      return `<path d="M7 19C1 19 1 26 7 26M25 19C31 19 31 26 25 26" fill="none" stroke="${p.accent}" stroke-width="2"/>`;
    case 7:
      return `<path d="M7 18L2 25L7 24ZM25 18L30 25L25 24Z" fill="${p.panel}" stroke="${p.ink}" stroke-width="1"/>`;
    case 8:
      return `${rect(2, 20, 5, 5, p.surface, ` rx="1"`)}${rect(25, 20, 5, 5, p.surface, ` rx="1"`)}${pixel(4, 22, p.glow)}${pixel(27, 22, p.glow)}`;
    default:
      return "";
  }
}

function bodySvg(bot: BotSpec, p: Palette): string {
  const outline = p.ink;
  const body = bot.body;
  let shape = "";
  switch (body) {
    case 0:
      shape = `${rect(8, 17, 16, 10, outline)}${rect(9, 18, 14, 8, p.surface)}${rect(11, 20, 10, 4, p.panel)}`;
      break;
    case 1:
      shape = `${rect(6, 18, 20, 8, outline)}${rect(7, 19, 18, 6, p.surface)}${rect(5, 25, 22, 3, outline)}${rect(6, 26, 20, 1, p.shade)}`;
      break;
    case 2:
      shape = `<path d="M9 17H23L26 23L22 27H10L6 23Z" fill="${outline}"/><path d="M10 18H22L24 23L21 25H11L8 23Z" fill="${p.surface}"/>${rect(12, 20, 8, 3, p.panel)}${pixel(10, 28, p.glow, 2)}${pixel(20, 28, p.glow, 2)}`;
      break;
    case 3:
      shape = `${rect(10, 17, 12, 9, outline)}${rect(11, 18, 10, 7, p.surface)}${rect(12, 25, 2, 4, outline)}${rect(18, 25, 2, 4, outline)}${pixel(11, 28, p.accent, 3)}${pixel(18, 28, p.accent, 3)}`;
      break;
    case 4:
      shape = `<path d="M10 17H22L25 20V25L22 28H10L7 25V20Z" fill="${outline}"/><path d="M11 18H21L23 20V24L21 26H11L9 24V20Z" fill="${p.surface}"/>${rect(12, 20, 8, 4, p.panel)}`;
      break;
    case 5:
      shape = `${rect(9, 16, 14, 12, outline, ` rx="2"`)}${rect(10, 17, 12, 10, p.surface, ` rx="1"`)}${rect(11, 19, 10, 5, p.panel)}${rect(12, 25, 8, 1, p.shade)}`;
      break;
    case 6:
      shape = `<path d="M8 18L11 16H21L24 18V26H8Z" fill="${outline}"/><path d="M10 19L12 18H20L22 19V25H10Z" fill="${p.surface}"/>${rect(13, 20, 6, 4, p.panel)}${pixel(8, 27, p.accent, 3)}${pixel(21, 27, p.accent, 3)}`;
      break;
    case 7:
      shape = `${rect(7, 18, 18, 9, outline)}${rect(8, 19, 16, 7, p.surface)}${rect(10, 20, 12, 5, p.shade)}${rect(12, 21, 8, 3, p.panel)}`;
      break;
    case 8:
      shape = `<path d="M7 20L10 17H22L25 20L23 26H9Z" fill="${outline}"/><path d="M9 20L11 19H21L23 20L21 24H11Z" fill="${p.surface}"/>${rect(13, 20, 6, 3, p.panel)}${rect(6, 25, 20, 2, p.shade)}`;
      break;
    case 9:
      shape = `<circle cx="16" cy="22" r="7" fill="${outline}"/><circle cx="16" cy="22" r="5.5" fill="${p.surface}"/>${rect(12, 20, 8, 4, p.panel)}${pixel(15, 25, p.accent, 2)}`;
      break;
    case 10:
      shape = `${rect(6, 19, 20, 7, outline)}${rect(7, 20, 18, 5, p.surface)}${rect(9, 17, 14, 3, outline)}${rect(10, 18, 12, 2, p.shade)}${rect(12, 21, 8, 3, p.panel)}`;
      break;
    default:
      shape = `<path d="M8 17H24L26 20V26L23 29H9L6 26V20Z" fill="${outline}"/><path d="M10 18H22L24 20V25L21 27H11L8 25V20Z" fill="${p.surface}"/>${rect(11, 20, 10, 5, p.panel)}${pixel(9, 26, p.accent, 2)}${pixel(21, 26, p.accent, 2)}`;
  }

  const pattern = patternSvg(bot, p);
  return shape + pattern;
}

function patternSvg(bot: BotSpec, p: Palette): string {
  switch (bot.pattern) {
    case 0:
      return `${rect(14, 19, 1, 6, p.accent)}${rect(17, 19, 1, 6, p.accent)}`;
    case 1:
      return `<path d="M10 24L14 19L17 24L21 19" fill="none" stroke="${p.accent}" stroke-width="1"/>`;
    case 2:
      return `${pixel(11, 20, p.glow)}${pixel(20, 20, p.glow)}${pixel(15, 23, p.glow, 2)}`;
    case 3:
      return `<path d="M10 22H22" stroke="${p.accent}" stroke-width="1" stroke-dasharray="2 1"/>`;
    case 4:
      return `<path d="M13 19H19L21 22L19 25H13L11 22Z" fill="none" stroke="${p.accent}" stroke-width="1"/>`;
    case 5:
      return `${rect(10, 20, 3, 1, p.accent)}${rect(19, 20, 3, 1, p.accent)}${rect(14, 23, 4, 1, p.accent)}`;
    case 6:
      return `<path d="M10 20L22 25M22 20L10 25" stroke="${p.accent}" stroke-width="1"/>`;
    default:
      return `${rect(12, 19, 8, 1, p.glow)}${rect(12, 24, 8, 1, p.glow)}`;
  }
}

function headSvg(bot: BotSpec, p: Palette): string {
  const i = p.ink;
  switch (bot.head) {
    case 0:
      return `${rect(9, 7, 14, 11, i)}${rect(10, 8, 12, 9, p.surface)}`;
    case 1:
      return `<path d="M9 17V11C9 6 23 6 23 11V17Z" fill="${i}"/><path d="M11 16V11C11 8 21 8 21 11V16Z" fill="${p.surface}"/>`;
    case 2:
      return `${rect(7, 7, 18, 11, i)}${rect(8, 8, 16, 9, p.surface)}${rect(9, 9, 14, 6, p.panel)}`;
    case 3:
      return `<path d="M11 6H21L25 17H7Z" fill="${i}"/><path d="M12 8H20L22 16H10Z" fill="${p.surface}"/>`;
    case 4:
      return `<path d="M8 7H24L22 18H10Z" fill="${i}"/><path d="M10 9H22L20 16H12Z" fill="${p.surface}"/>${rect(9, 6, 14, 2, p.shade)}`;
    case 5:
      return `<path d="M8 9L10 5L13 8H19L22 5L24 9V18H8Z" fill="${i}"/><path d="M10 10L11 8L13 10H19L21 8L22 10V16H10Z" fill="${p.surface}"/>`;
    case 6:
      return `${rect(9, 7, 14, 11, i)}${rect(10, 8, 12, 9, p.surface)}${rect(6, 9, 4, 6, p.shade)}${rect(22, 9, 4, 6, p.shade)}`;
    case 7:
      return `<path d="M8 8H10V6H13V8H19V6H22V8H24V18H8Z" fill="${i}"/><path d="M10 9H22V16H10Z" fill="${p.surface}"/>`;
    case 8:
      return `<circle cx="16" cy="12" r="7" fill="${i}"/><circle cx="16" cy="12" r="5.5" fill="${p.surface}"/>`;
    case 9:
      return `${rect(7, 6, 18, 12, i, ` rx="1"`)}${rect(8, 7, 16, 10, p.surface)}${rect(9, 8, 14, 7, p.panel)}`;
    case 10:
      return `<path d="M16 4L25 17H7Z" fill="${i}"/><path d="M16 7L22 16H10Z" fill="${p.surface}"/>`;
    case 11:
      return `<path d="M9 10C9 5 23 5 23 10V15C23 19 9 19 9 15Z" fill="${i}"/><path d="M11 10C11 7 21 7 21 10V15C21 17 11 17 11 15Z" fill="${p.surface}"/>`;
    case 12:
      return `<path d="M8 8H24L22 18H10Z" fill="${i}"/><path d="M10 9H22L21 16H11Z" fill="${p.surface}"/>${rect(9, 10, 14, 4, p.panel)}`;
    case 13:
      return `<path d="M10 6H22V9L24 11V18H8V11L10 9Z" fill="${i}"/><path d="M12 8H20V10L22 12V16H10V12L12 10Z" fill="${p.surface}"/>${rect(15, 5, 2, 3, p.accent)}`;
    case 14:
      return `<path d="M9 7H23V15L20 18H18V16H14V18H12L9 15Z" fill="${i}"/><path d="M11 9H21V14L19 16H13L11 14Z" fill="${p.surface}"/>`;
    default:
      return `<path d="M8 8C8 5 24 5 24 8V15L21 18H18V16H14V18H11L8 15Z" fill="${i}"/><path d="M10 9C10 7 22 7 22 9V14L20 16H12L10 14Z" fill="${p.surface}"/>`;
  }
}

function eyesSvg(bot: BotSpec, p: Palette): string {
  const y = bot.head === 10 ? 12 : 11;
  switch (bot.eyes) {
    case 0:
      return `${pixel(13, y, p.glow, 2)}${pixel(18, y, p.glow, 2)}`;
    case 1:
      return `${rect(12, y, 3, 2, p.glow)}${rect(17, y, 3, 2, p.glow)}`;
    case 2:
      return rect(11, y, 10, 2, p.glow);
    case 3:
      return `${rect(14, y - 1, 4, 4, p.ink)}${rect(15, y, 2, 2, p.glow)}`;
    case 4:
      return `${rect(12, y + 1, 3, 1, p.glow)}${rect(17, y + 1, 3, 1, p.glow)}`;
    case 5:
      return `<path d="M11 ${y + 2}H13V${y}H15V${y + 2}H17V${y}H19V${y + 2}H21" fill="none" stroke="${p.glow}" stroke-width="1"/>`;
    case 6:
      return `${pixel(11, y + 1, p.glow)}${pixel(15, y - 1, p.glow, 2)}${pixel(20, y + 1, p.glow)}`;
    case 7:
      return `<path d="M12 ${y}L15 ${y + 3}M15 ${y}L12 ${y + 3}M17 ${y}L20 ${y + 3}M20 ${y}L17 ${y + 3}" stroke="${p.glow}" stroke-width="1"/>`;
    case 8:
      return `<circle cx="13.5" cy="${y + 1}" r="1.5" fill="none" stroke="${p.glow}" stroke-width="1"/><circle cx="18.5" cy="${y + 1}" r="1.5" fill="none" stroke="${p.glow}" stroke-width="1"/>`;
    case 9:
      return `${pixel(12, y, p.glow)}${pixel(14, y + 1, p.glow)}${pixel(18, y + 1, p.glow)}${pixel(20, y, p.glow)}`;
    case 10:
      return `<path d="M11 ${y + 1}C13 ${y - 1} 15 ${y + 3} 17 ${y + 1}S21 ${y + 1} 21 ${y + 1}" fill="none" stroke="${p.glow}" stroke-width="1"/>`;
    default:
      return `${rect(12, y, 3, 2, p.glow)}${rect(17, y, 3, 2, p.glow)}${pixel(13, y, "#ffffff")}${pixel(18, y, "#ffffff")}`;
  }
}

function mouthSvg(bot: BotSpec, p: Palette): string {
  const y = bot.head === 10 ? 15 : 15;
  switch (bot.mouth) {
    case 0:
      return `${pixel(13, y, p.ink)}${pixel(15, y, p.ink)}${pixel(17, y, p.ink)}${pixel(19, y, p.ink)}`;
    case 1:
      return rect(13, y, 6, 1, p.ink);
    case 2:
      return `<path d="M13 ${y}H14V${y + 1}H18V${y}H19" fill="none" stroke="${p.ink}" stroke-width="1"/>`;
    case 3:
      return `${rect(13, y - 1, 6, 3, p.ink)}${pixel(14, y, p.glow)}${pixel(16, y, p.glow)}${pixel(18, y, p.glow)}`;
    case 4:
      return "";
    case 5:
      return `<path d="M12 ${y + 1}H14V${y - 1}H16V${y + 1}H18V${y - 1}H20" fill="none" stroke="${p.accent}" stroke-width="1"/>`;
    case 6:
      return `<path d="M13 ${y}H19L18 ${y + 2}L17 ${y}L16 ${y + 2}L15 ${y}L14 ${y + 2}Z" fill="${p.ink}"/>`;
    case 7:
      return `${rect(12, y - 1, 8, 3, p.ink)}${rect(13, y, 6, 1, p.panel)}`;
    case 8:
      return `<path d="M13 ${y}H15V${y + 1}H17V${y}H19" fill="none" stroke="${p.ink}" stroke-width="1"/>`;
    default:
      return `${rect(14, y - 1, 4, 3, p.ink)}${rect(15, y, 2, 1, p.glow)}`;
  }
}

function topSvg(bot: BotSpec, p: Palette): string {
  switch (bot.top) {
    case 0:
      return `${rect(15, 2, 2, 5, p.ink)}${pixel(15, 1, p.glow, 2)}`;
    case 1:
      return `<path d="M11 8L8 2H11L13 7M21 8L24 2H21L19 7" fill="${p.accent}" stroke="${p.ink}" stroke-width="1"/>`;
    case 2:
      return `${rect(13, 4, 6, 3, p.ink)}${rect(14, 3, 4, 3, p.glow)}`;
    case 3:
      return `<path d="M14 7L18 1L19 7Z" fill="${p.accent}" stroke="${p.ink}" stroke-width="1"/>`;
    case 4:
      return `${rect(15, 2, 2, 5, p.ink)}<path d="M17 2L23 1V6L17 5Z" fill="${p.panel}" stroke="${p.ink}" stroke-width="1"/>`;
    case 5:
      return `${rect(15, 3, 2, 4, p.ink)}${rect(10, 2, 12, 2, p.accent)}${pixel(15, 1, p.ink, 2)}`;
    case 6:
      return `<path d="M10 7L9 2L13 4L16 1L19 4L23 2L22 7Z" fill="${p.accent}" stroke="${p.ink}" stroke-width="1"/>`;
    case 7:
      return `<path d="M12 7L10 2H22L20 7Z" fill="${p.panel}" stroke="${p.ink}" stroke-width="1"/>${rect(13, 3, 3, 1, p.accent)}${rect(17, 5, 3, 1, p.accent)}`;
    case 8:
      return `<path d="M10 8L8 3L13 7M22 8L24 3L19 7" fill="${p.surface}" stroke="${p.ink}" stroke-width="1"/>`;
    case 9:
      return `<ellipse cx="16" cy="4" rx="8" ry="2" fill="none" stroke="${p.glow}" stroke-width="1"/>`;
    case 10:
      return `<path d="M11 8L12 4L14 6L16 1L18 6L20 4L21 8Z" fill="${p.accent}" stroke="${p.ink}" stroke-width="1"/>`;
    case 11:
      return `${rect(15, 3, 2, 4, p.ink)}<path d="M16 3C10 3 9 0 9 0C14 0 17 1 16 3Z" fill="${p.panel}" stroke="${p.ink}" stroke-width="1"/>`;
    case 12:
      return `${rect(13, 2, 3, 5, p.shade)}${rect(17, 0, 3, 7, p.surface)}${pixel(18, 1, p.glow)}`;
    default:
      return "";
  }
}

function raritySvg(bot: BotSpec, p: Palette): string {
  if (bot.rarityRank < 2) return "";
  const count = bot.rarityRank === 2 ? 2 : bot.rarityRank === 3 ? 4 : 6;
  const points: [number, number][] = [
    [4, 5], [27, 6], [4, 24], [28, 21], [7, 11], [25, 14],
  ];
  return points
    .slice(0, count)
    .map(([x, y], index) => `<path d="M${x} ${y - 1}V${y + 1}M${x - 1} ${y}H${x + 1}" stroke="${index % 2 ? p.glow : p.accent}" stroke-width="1"/>`)
    .join("");
}

export function renderBotSvg(bot: BotSpec, options: { title?: boolean; className?: string } = {}): string {
  const p = PALETTES[bot.palette]!;
  const titleId = `title-${bot.serial.toLowerCase()}`;
  const title = options.title === false ? "" : `<title id="${titleId}">${esc(bot.serial)} ${esc(bot.name)}</title>`;
  const labelledBy = options.title === false ? ` aria-hidden="true" focusable="false"` : ` role="img" aria-labelledby="${titleId}"`;
  const classAttr = options.className ? ` class="${esc(options.className)}"` : "";
  return `<svg${classAttr}${labelledBy} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${title}${backgroundSvg(bot, p)}<g>${raritySvg(bot, p)}${rearSideSvg(bot, p)}${topSvg(bot, p)}${bodySvg(bot, p)}${headSvg(bot, p)}${eyesSvg(bot, p)}${mouthSvg(bot, p)}</g></svg>`;
}

export function botSearchText(bot: BotSpec): string {
  return `${bot.serial} ${bot.name} ${bot.tags.join(" ")}`.toLocaleLowerCase("ko-KR");
}

export function catalogStats(catalog = createCatalog()): {
  count: number;
  uniqueCoreSignatures: number;
  rarity: Record<Rarity, number>;
  palettes: number;
} {
  const rarity = Object.fromEntries(RARITY_NAMES.map((name) => [name, 0])) as Record<Rarity, number>;
  for (const bot of catalog) rarity[bot.rarity] += 1;
  return {
    count: catalog.length,
    uniqueCoreSignatures: new Set(catalog.map((bot) => bot.coreSignature)).size,
    rarity,
    palettes: new Set(catalog.map((bot) => bot.palette)).size,
  };
}
