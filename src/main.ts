import "./styles.css";
import {
  BOT_COUNT,
  BODY_NAMES,
  COLOR_FAMILIES,
  EYE_NAMES,
  HEAD_NAMES,
  MOOD_NAMES,
  MOUTH_NAMES,
  PALETTES,
  RARITY_NAMES,
  SIDE_NAMES,
  TOP_NAMES,
  botSearchText,
  catalogStats,
  createCatalog,
  renderBotSvg,
  type BotSpec,
} from "./bot-engine";

type SortMode = "id-asc" | "id-desc" | "rarity" | "name" | "shuffle";
type Theme = "dark" | "light";

type GalleryState = {
  query: string;
  body: number | null;
  rarity: string | null;
  colorFamily: number | null;
  mood: number | null;
  favoritesOnly: boolean;
  sort: SortMode;
  page: number;
  pageSize: number;
  shuffleSalt: number;
};

const catalog = createCatalog();
const stats = catalogStats(catalog);
const searchIndex = catalog.map(botSearchText);
const app = document.querySelector<HTMLDivElement>("#app")!;
if (!app) throw new Error("#app element is missing");

const FAVORITES_KEY = "botland:favorites:v1";
const THEME_KEY = "botland:theme:v1";
const PAGE_SIZE_OPTIONS = [48, 72, 96] as const;

let favorites = loadFavorites();
let theme = loadTheme();
let selectedBotId: number | null = null;
let suppressHashChange = false;
let searchTimer = 0;

const state: GalleryState = {
  query: "",
  body: null,
  rarity: null,
  colorFamily: null,
  mood: null,
  favoritesOnly: false,
  sort: "id-asc",
  page: 1,
  pageSize: 72,
  shuffleSalt: Date.now() >>> 0,
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const values = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(values)) return new Set();
    return new Set(
      values.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < BOT_COUNT),
    );
  } catch {
    return new Set();
  }
}

function saveFavorites(): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites].sort((a, b) => a - b)));
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(next: Theme): void {
  theme = next;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (button) {
    button.setAttribute("aria-label", theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환");
    button.innerHTML = theme === "dark" ? sunIcon() : moonIcon();
  }
}

function iconPath(path: string, className = "icon"): string {
  return `<svg class="${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

function searchIcon(): string {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
}

function heartIcon(filled = false): string {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" ${filled ? 'fill="currentColor"' : 'fill="none"'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`;
}

function sunIcon(): string {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>`;
}

function moonIcon(): string {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2 8.5 8.5 0 1 0 20.8 15.2Z"/></svg>`;
}

function shuffleIcon(): string {
  return iconPath("M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5");
}

function downloadIcon(): string {
  return iconPath("M12 3v12m0 0 4-4m-4 4-4-4M4 19h16");
}

function closeIcon(): string {
  return iconPath("M5 5l14 14M19 5 5 19");
}

function arrowIcon(direction: "left" | "right"): string {
  return direction === "left" ? iconPath("m15 18-6-6 6-6") : iconPath("m9 18 6-6-6-6");
}

function copyIcon(): string {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`;
}

function selectOptions(values: readonly string[], placeholder: string): string {
  return `<option value="">${placeholder}</option>${values
    .map((value, index) => `<option value="${index}">${escapeHtml(value)}</option>`)
    .join("")}`;
}

function rarityOptions(): string {
  return `<option value="">모든 희귀도</option>${RARITY_NAMES.map((value) => `<option value="${value}">${value}</option>`).join("")}`;
}

function pageSizeOptions(): string {
  return PAGE_SIZE_OPTIONS.map((size) => `<option value="${size}"${size === state.pageSize ? " selected" : ""}>${size}개</option>`).join("");
}

function renderShell(): void {
  app.innerHTML = `
    <a class="skip-link" href="#gallery-grid">갤러리로 바로가기</a>
    <header class="site-header">
      <a class="brand" href="./" aria-label="Botland Gallery 홈">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
        <span>BOTLAND</span>
        <span class="brand-sub">GALLERY</span>
      </a>
      <nav class="header-actions" aria-label="주요 기능">
        <button class="icon-button" id="favorites-header" type="button" aria-label="즐겨찾기만 보기">${heartIcon()}<span id="header-favorite-count">${favorites.size}</span></button>
        <button class="icon-button" id="theme-toggle" type="button"></button>
        <a class="icon-button" href="https://github.com/beerAndNacho/botlandgallary" target="_blank" rel="noreferrer" aria-label="GitHub 저장소 열기">
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.8 5.4-5.5 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.3 11.3 0 0 0 12 .7Z"/></svg>
        </a>
      </nav>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span></span> DETERMINISTIC PIXEL ROBOTS</p>
          <h1 id="hero-title">하나도 겹치지 않는<br><strong>10,000개의 봇</strong></h1>
          <p class="hero-description">부품, 색상, 표정, 장비를 조합해 만든 오리지널 픽셀 로봇 컬렉션입니다. 번호로 찾고, 취향대로 필터링하고, SVG나 PNG로 바로 저장하세요.</p>
          <div class="hero-actions">
            <button class="primary-button" id="random-bot" type="button">${shuffleIcon()} 랜덤 봇 만나기</button>
            <a class="secondary-button" href="#gallery">컬렉션 둘러보기 ${arrowIcon("right")}</a>
          </div>
        </div>
        <div class="hero-showcase" aria-label="대표 봇 미리보기">
          <div class="showcase-orbit" aria-hidden="true"></div>
          <div class="showcase-card showcase-card--back" id="hero-bot-back"></div>
          <div class="showcase-card showcase-card--side" id="hero-bot-side"></div>
          <button class="showcase-card showcase-card--main" id="hero-bot-main" type="button" aria-label="대표 봇 상세 보기"></button>
          <span class="showcase-label">LIVE SPECIMEN</span>
        </div>
      </section>

      <section class="collection-stats" aria-label="컬렉션 통계">
        <div><strong>${stats.count.toLocaleString("ko-KR")}</strong><span>총 봇 수</span></div>
        <div><strong>${stats.uniqueCoreSignatures.toLocaleString("ko-KR")}</strong><span>고유 핵심 조합</span></div>
        <div><strong>${PALETTES.length}</strong><span>컬러 팔레트</span></div>
        <div><strong>${BODY_NAMES.length * HEAD_NAMES.length * EYE_NAMES.length * TOP_NAMES.length > BOT_COUNT ? "0" : "-"}</strong><span>중복 디자인</span></div>
      </section>

      <section class="gallery-section" id="gallery" aria-labelledby="gallery-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow"><span></span> THE FULL CATALOG</p>
            <h2 id="gallery-title">봇 아카이브</h2>
          </div>
          <p>10,000개 전체를 브라우저에서 즉시 생성합니다.</p>
        </div>

        <form class="filter-panel" id="filter-form" role="search">
          <label class="search-field">
            <span class="sr-only">봇 검색</span>
            ${searchIcon()}
            <input id="search-input" type="search" autocomplete="off" placeholder="이름, 번호, 부품으로 검색" />
            <kbd>/</kbd>
          </label>
          <div class="filter-row">
            <label><span>바디</span><select id="body-filter">${selectOptions(BODY_NAMES, "모든 바디")}</select></label>
            <label><span>색상</span><select id="color-filter">${selectOptions(COLOR_FAMILIES, "모든 색상")}</select></label>
            <label><span>기분</span><select id="mood-filter">${selectOptions(MOOD_NAMES, "모든 기분")}</select></label>
            <label><span>희귀도</span><select id="rarity-filter">${rarityOptions()}</select></label>
            <label><span>정렬</span>
              <select id="sort-filter">
                <option value="id-asc">번호 낮은 순</option>
                <option value="id-desc">번호 높은 순</option>
                <option value="rarity">희귀도 순</option>
                <option value="name">이름 순</option>
                <option value="shuffle">랜덤 정렬</option>
              </select>
            </label>
            <button class="filter-reset" id="filter-reset" type="button">필터 초기화</button>
          </div>
          <div class="active-filter-bar">
            <button class="favorite-filter" id="favorites-only" type="button" aria-pressed="false">${heartIcon()} 즐겨찾기 <span>${favorites.size}</span></button>
            <div id="active-filters" class="active-filters" aria-live="polite"></div>
          </div>
        </form>

        <div class="gallery-toolbar">
          <p id="result-summary" aria-live="polite"></p>
          <label class="page-size"><span>한 페이지</span><select id="page-size">${pageSizeOptions()}</select></label>
        </div>

        <div class="bot-grid" id="gallery-grid" tabindex="-1"></div>
        <nav class="pagination" id="pagination" aria-label="갤러리 페이지"></nav>
      </section>
    </main>

    <footer class="site-footer">
      <div>
        <a class="brand brand--footer" href="./"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span><span>BOTLAND</span></a>
        <p>10,000 deterministic robots. Built as a lightweight static gallery.</p>
      </div>
      <div class="footer-links"><a href="https://github.com/shevenionov/botlab" target="_blank" rel="noreferrer">Inspired by Botlab</a><a href="./notices.html">Open-source notices</a></div>
    </footer>

    <dialog class="bot-dialog" id="bot-dialog" aria-labelledby="dialog-title">
      <div id="dialog-content"></div>
    </dialog>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;

  applyTheme(theme);
  renderHeroBots();
  bindShellEvents();
  renderGallery();
}

function renderHeroBots(): void {
  const heroIds = [61, 4242, 9001];
  const slots = ["hero-bot-back", "hero-bot-side", "hero-bot-main"];
  slots.forEach((slot, index) => {
    const element = document.querySelector<HTMLElement>(`#${slot}`);
    const bot = catalog[heroIds[index]!]!;
    if (!element) return;
    element.innerHTML = `${renderBotSvg(bot, { title: false })}<span>${bot.serial}</span>`;
    element.dataset.id = String(bot.id);
  });
}

function bindShellEvents(): void {
  document.querySelector<HTMLButtonElement>("#theme-toggle")?.addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });

  document.querySelector<HTMLButtonElement>("#random-bot")?.addEventListener("click", openRandomBot);
  document.querySelector<HTMLButtonElement>("#hero-bot-main")?.addEventListener("click", (event) => {
    const id = Number((event.currentTarget as HTMLElement).dataset.id);
    openBot(id);
  });

  document.querySelector<HTMLButtonElement>("#favorites-header")?.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    state.page = 1;
    syncFilterControls();
    renderGallery();
    document.querySelector("#gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const searchInput = document.querySelector<HTMLInputElement>("#search-input");
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.query = searchInput.value.trim().toLocaleLowerCase("ko-KR");
      state.page = 1;
      renderGallery();
    }, 120);
  });

  bindSelect("#body-filter", (value) => (state.body = parseNullableNumber(value)));
  bindSelect("#color-filter", (value) => (state.colorFamily = parseNullableNumber(value)));
  bindSelect("#mood-filter", (value) => (state.mood = parseNullableNumber(value)));
  bindSelect("#rarity-filter", (value) => (state.rarity = value || null));
  bindSelect("#sort-filter", (value) => {
    state.sort = value as SortMode;
    if (state.sort === "shuffle") state.shuffleSalt = crypto.getRandomValues(new Uint32Array(1))[0]!;
  });
  bindSelect("#page-size", (value) => {
    state.pageSize = Number(value);
    state.page = 1;
  });

  document.querySelector<HTMLButtonElement>("#favorites-only")?.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    state.page = 1;
    syncFilterControls();
    renderGallery();
  });

  document.querySelector<HTMLButtonElement>("#filter-reset")?.addEventListener("click", resetFilters);

  document.querySelector<HTMLDivElement>("#gallery-grid")?.addEventListener("click", handleGalleryClick);
  document.querySelector<HTMLElement>("#pagination")?.addEventListener("click", handlePaginationClick);

  const dialog = document.querySelector<HTMLDialogElement>("#bot-dialog");
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog?.addEventListener("close", () => {
    selectedBotId = null;
    if (location.hash.startsWith("#bot-")) clearHash();
  });
  document.querySelector<HTMLDivElement>("#dialog-content")?.addEventListener("click", handleDialogClick);

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") {
      event.preventDefault();
      searchInput?.focus();
    }
    if (!dialog?.open || selectedBotId === null) return;
    if (event.key === "ArrowLeft") moveDialog(-1);
    if (event.key === "ArrowRight") moveDialog(1);
  });

  window.addEventListener("hashchange", () => {
    if (suppressHashChange) return;
    const id = idFromHash();
    if (id === null) {
      if (dialog?.open) dialog.close();
      return;
    }
    openBot(id, false);
  });

  const initialId = idFromHash();
  if (initialId !== null) requestAnimationFrame(() => openBot(initialId, false));
}

function bindSelect(selector: string, update: (value: string) => void): void {
  document.querySelector<HTMLSelectElement>(selector)?.addEventListener("change", (event) => {
    update((event.currentTarget as HTMLSelectElement).value);
    state.page = 1;
    renderGallery();
  });
}

function parseNullableNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function resetFilters(): void {
  state.query = "";
  state.body = null;
  state.rarity = null;
  state.colorFamily = null;
  state.mood = null;
  state.favoritesOnly = false;
  state.sort = "id-asc";
  state.page = 1;
  const searchInput = document.querySelector<HTMLInputElement>("#search-input");
  if (searchInput) searchInput.value = "";
  syncFilterControls();
  renderGallery();
}

function syncFilterControls(): void {
  setSelectValue("#body-filter", state.body);
  setSelectValue("#color-filter", state.colorFamily);
  setSelectValue("#mood-filter", state.mood);
  setSelectValue("#rarity-filter", state.rarity);
  setSelectValue("#sort-filter", state.sort);
  setSelectValue("#page-size", state.pageSize);
  const favoriteButton = document.querySelector<HTMLButtonElement>("#favorites-only");
  if (favoriteButton) {
    favoriteButton.setAttribute("aria-pressed", String(state.favoritesOnly));
    favoriteButton.classList.toggle("is-active", state.favoritesOnly);
    favoriteButton.innerHTML = `${heartIcon(state.favoritesOnly)} 즐겨찾기 <span>${favorites.size}</span>`;
  }
  document.querySelector<HTMLButtonElement>("#favorites-header")?.classList.toggle("is-active", state.favoritesOnly);
}

function setSelectValue(selector: string, value: string | number | null): void {
  const element = document.querySelector<HTMLSelectElement>(selector);
  if (element) element.value = value === null ? "" : String(value);
}

function shuffledRank(bot: BotSpec): number {
  let x = (bot.seed ^ state.shuffleSalt) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  return x >>> 0;
}

function getFilteredBots(): BotSpec[] {
  const result: BotSpec[] = [];
  for (let index = 0; index < catalog.length; index += 1) {
    const bot = catalog[index]!;
    if (state.query && !searchIndex[index]!.includes(state.query)) continue;
    if (state.body !== null && bot.body !== state.body) continue;
    if (state.rarity !== null && bot.rarity !== state.rarity) continue;
    if (state.colorFamily !== null && bot.colorFamily !== state.colorFamily) continue;
    if (state.mood !== null && bot.mood !== state.mood) continue;
    if (state.favoritesOnly && !favorites.has(bot.id)) continue;
    result.push(bot);
  }

  if (state.sort === "id-desc") result.reverse();
  if (state.sort === "rarity") result.sort((a, b) => b.rarityRank - a.rarityRank || a.id - b.id);
  if (state.sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "ko-KR") || a.id - b.id);
  if (state.sort === "shuffle") result.sort((a, b) => shuffledRank(a) - shuffledRank(b));
  return result;
}

function renderGallery(): void {
  const filtered = getFilteredBots();
  const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), pageCount);
  const offset = (state.page - 1) * state.pageSize;
  const pageBots = filtered.slice(offset, offset + state.pageSize);

  const grid = document.querySelector<HTMLDivElement>("#gallery-grid");
  if (grid) {
    grid.innerHTML = pageBots.length ? pageBots.map(renderCard).join("") : renderEmptyState();
  }

  const summary = document.querySelector<HTMLParagraphElement>("#result-summary");
  if (summary) {
    const first = filtered.length ? offset + 1 : 0;
    const last = Math.min(offset + state.pageSize, filtered.length);
    summary.innerHTML = `<strong>${filtered.length.toLocaleString("ko-KR")}</strong>개 중 ${first.toLocaleString("ko-KR")}–${last.toLocaleString("ko-KR")} 표시`;
  }

  renderActiveFilters();
  renderPagination(pageCount);
  syncFilterControls();
  updateFavoriteCounts();
}

function renderCard(bot: BotSpec): string {
  const isFavorite = favorites.has(bot.id);
  const palette = PALETTES[bot.palette]!;
  return `
    <article class="bot-card rarity-${bot.rarityRank}" data-id="${bot.id}">
      <button class="bot-preview" data-action="open" type="button" aria-label="${escapeHtml(bot.serial)} ${escapeHtml(bot.name)} 상세 보기">
        <span class="bot-svg">${renderBotSvg(bot, { title: false })}</span>
        <span class="card-rarity">${bot.rarity}</span>
        <span class="card-open">상세 보기 ${arrowIcon("right")}</span>
      </button>
      <div class="bot-card-info">
        <div>
          <span class="bot-serial">${bot.serial}</span>
          <h3>${escapeHtml(bot.name)}</h3>
        </div>
        <button class="favorite-button${isFavorite ? " is-favorite" : ""}" data-action="favorite" type="button" aria-label="${isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}" aria-pressed="${isFavorite}">${heartIcon(isFavorite)}</button>
      </div>
      <div class="bot-card-tags"><span>${escapeHtml(BODY_NAMES[bot.body]!)}</span><span>${escapeHtml(COLOR_FAMILIES[palette.family]!)}</span><span>${escapeHtml(MOOD_NAMES[bot.mood]!)}</span></div>
    </article>
  `;
}

function renderEmptyState(): string {
  return `<div class="empty-state"><span class="empty-bot" aria-hidden="true">[•_•]</span><h3>조건에 맞는 봇이 없습니다</h3><p>검색어나 필터를 바꾸면 새로운 봇을 만날 수 있습니다.</p><button class="secondary-button" data-action="reset" type="button">필터 초기화</button></div>`;
}

function renderActiveFilters(): void {
  const items: string[] = [];
  if (state.query) items.push(`검색: ${state.query}`);
  if (state.body !== null) items.push(`바디: ${BODY_NAMES[state.body]}`);
  if (state.colorFamily !== null) items.push(`색상: ${COLOR_FAMILIES[state.colorFamily]}`);
  if (state.mood !== null) items.push(`기분: ${MOOD_NAMES[state.mood]}`);
  if (state.rarity !== null) items.push(`희귀도: ${state.rarity}`);
  if (state.favoritesOnly) items.push("즐겨찾기만");
  const target = document.querySelector<HTMLDivElement>("#active-filters");
  if (!target) return;
  target.innerHTML = items.length
    ? items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
    : `<span class="filter-hint">필터를 조합해 원하는 봇을 찾아보세요.</span>`;
}

function renderPagination(pageCount: number): void {
  const target = document.querySelector<HTMLElement>("#pagination");
  if (!target) return;
  if (pageCount <= 1) {
    target.innerHTML = "";
    return;
  }

  const pages = paginationWindow(state.page, pageCount);
  target.innerHTML = `
    <button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="이전 페이지">${arrowIcon("left")}</button>
    <div class="page-numbers">
      ${pages
        .map((page) =>
          page === "…"
            ? `<span aria-hidden="true">…</span>`
            : `<button type="button" data-page="${page}"${page === state.page ? ' class="is-current" aria-current="page"' : ""}>${page}</button>`,
        )
        .join("")}
    </div>
    <button type="button" data-page="${state.page + 1}" ${state.page === pageCount ? "disabled" : ""} aria-label="다음 페이지">${arrowIcon("right")}</button>
  `;
}

function paginationWindow(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]!;
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push("…");
    result.push(page);
  }
  return result;
}

function handleGalleryClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const resetButton = target.closest<HTMLButtonElement>('[data-action="reset"]');
  if (resetButton) {
    resetFilters();
    return;
  }
  const card = target.closest<HTMLElement>(".bot-card");
  if (!card) return;
  const id = Number(card.dataset.id);
  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "favorite") toggleFavorite(id);
  if (action === "open") openBot(id);
}

function handlePaginationClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-page]");
  if (!button || button.disabled) return;
  state.page = Number(button.dataset.page);
  renderGallery();
  document.querySelector("#gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleFavorite(id: number): void {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites();
  renderGallery();
  if (selectedBotId === id) renderDialog(catalog[id]!);
  showToast(favorites.has(id) ? "즐겨찾기에 추가했습니다." : "즐겨찾기에서 제거했습니다.");
}

function updateFavoriteCounts(): void {
  const headerCount = document.querySelector<HTMLElement>("#header-favorite-count");
  if (headerCount) headerCount.textContent = String(favorites.size);
  const favoriteFilterCount = document.querySelector<HTMLElement>("#favorites-only span");
  if (favoriteFilterCount) favoriteFilterCount.textContent = String(favorites.size);
}

function openRandomBot(): void {
  const random = crypto.getRandomValues(new Uint32Array(1))[0]! % BOT_COUNT;
  openBot(random);
}

function openBot(id: number, updateHash = true): void {
  const bot = catalog[id];
  if (!bot) return;
  selectedBotId = id;
  renderDialog(bot);
  const dialog = document.querySelector<HTMLDialogElement>("#bot-dialog");
  if (!dialog?.open) dialog?.showModal();
  if (updateHash) setHash(bot);
}

function renderDialog(bot: BotSpec): void {
  const target = document.querySelector<HTMLDivElement>("#dialog-content");
  if (!target) return;
  const isFavorite = favorites.has(bot.id);
  const palette = PALETTES[bot.palette]!;
  const traits = [
    ["바디", BODY_NAMES[bot.body]],
    ["헤드", HEAD_NAMES[bot.head]],
    ["눈", EYE_NAMES[bot.eyes]],
    ["입", MOUTH_NAMES[bot.mouth]],
    ["탑", TOP_NAMES[bot.top]],
    ["장비", SIDE_NAMES[bot.side]],
    ["기분", MOOD_NAMES[bot.mood]],
    ["팔레트", palette.name],
  ];
  target.innerHTML = `
    <button class="dialog-close" data-dialog-action="close" type="button" aria-label="상세 보기 닫기">${closeIcon()}</button>
    <div class="dialog-layout">
      <div class="dialog-art rarity-${bot.rarityRank}">
        ${renderBotSvg(bot)}
        <div class="dialog-art-controls">
          <button type="button" data-dialog-action="previous" aria-label="이전 봇">${arrowIcon("left")}</button>
          <span>${bot.id + 1} / ${BOT_COUNT.toLocaleString("ko-KR")}</span>
          <button type="button" data-dialog-action="next" aria-label="다음 봇">${arrowIcon("right")}</button>
        </div>
      </div>
      <div class="dialog-info">
        <div class="dialog-title-row">
          <div>
            <span class="bot-serial">${bot.serial}</span>
            <h2 id="dialog-title">${escapeHtml(bot.name)}</h2>
          </div>
          <button class="favorite-button dialog-favorite${isFavorite ? " is-favorite" : ""}" data-dialog-action="favorite" type="button" aria-pressed="${isFavorite}" aria-label="${isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}">${heartIcon(isFavorite)}</button>
        </div>
        <div class="rarity-line"><span class="rarity-dot"></span>${bot.rarity}<span>코어 조합 ${bot.coreSignature}</span></div>
        <p class="dialog-description">${escapeHtml(MOOD_NAMES[bot.mood]!)} 성향의 ${escapeHtml(BODY_NAMES[bot.body]!)} 유닛. ${escapeHtml(palette.name)} 팔레트와 ${escapeHtml(TOP_NAMES[bot.top]!)} 모듈을 장착했습니다.</p>
        <dl class="trait-grid">
          ${traits.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value!)}</dd></div>`).join("")}
        </dl>
        <div class="download-group">
          <button class="primary-button" data-dialog-action="png" type="button">${downloadIcon()} PNG 저장</button>
          <button class="secondary-button" data-dialog-action="svg" type="button">${downloadIcon()} SVG 저장</button>
          <button class="icon-button copy-button" data-dialog-action="copy" type="button" aria-label="공유 링크 복사">${copyIcon()}</button>
        </div>
        <p class="download-note">PNG 1024×1024 · SVG 벡터 원본 · 개인 및 상업 프로젝트에서 활용 가능</p>
      </div>
    </div>
  `;
}

function handleDialogClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-dialog-action]");
  if (!button || selectedBotId === null) return;
  const action = button.dataset.dialogAction;
  const bot = catalog[selectedBotId]!;
  if (action === "close") closeDialog();
  if (action === "previous") moveDialog(-1);
  if (action === "next") moveDialog(1);
  if (action === "favorite") toggleFavorite(bot.id);
  if (action === "svg") downloadSvg(bot);
  if (action === "png") void downloadPng(bot);
  if (action === "copy") void copyShareLink(bot);
}

function closeDialog(): void {
  document.querySelector<HTMLDialogElement>("#bot-dialog")?.close();
}

function moveDialog(direction: -1 | 1): void {
  if (selectedBotId === null) return;
  const next = (selectedBotId + direction + BOT_COUNT) % BOT_COUNT;
  openBot(next);
}

function idFromHash(): number | null {
  const match = location.hash.match(/^#bot-(\d{5})$/);
  if (!match) return null;
  const id = Number(match[1]) - 1;
  return id >= 0 && id < BOT_COUNT ? id : null;
}

function setHash(bot: BotSpec): void {
  const hash = `#bot-${String(bot.id + 1).padStart(5, "0")}`;
  if (location.hash === hash) return;
  history.pushState(null, "", hash);
}

function clearHash(): void {
  suppressHashChange = true;
  history.pushState(null, "", `${location.pathname}${location.search}`);
  queueMicrotask(() => (suppressHashChange = false));
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function downloadSvg(bot: BotSpec): void {
  const svg = renderBotSvg(bot);
  downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${bot.serial.toLowerCase()}-${slug(bot.name)}.svg`);
  showToast("SVG 파일을 저장했습니다.");
}

async function downloadPng(bot: BotSpec): Promise<void> {
  const svg = renderBotSvg(bot);
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG encoding failed"))), "image/png");
    });
    downloadBlob(blob, `${bot.serial.toLowerCase()}-${slug(bot.name)}.png`);
    showToast("1024×1024 PNG 파일을 저장했습니다.");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function copyShareLink(bot: BotSpec): Promise<void> {
  const url = new URL(location.href);
  url.hash = `bot-${String(bot.id + 1).padStart(5, "0")}`;
  await navigator.clipboard.writeText(url.toString());
  showToast("공유 링크를 복사했습니다.");
}

function slug(value: string): string {
  return value.trim().toLocaleLowerCase("ko-KR").replaceAll(/\s+/g, "-").replaceAll(/[^\p{L}\p{N}-]/gu, "");
}

let toastTimer = 0;
function showToast(message: string): void {
  const toast = document.querySelector<HTMLDivElement>("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2_000);
}

renderShell();
