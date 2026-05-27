import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SITE = "https://aoglang.com";

const navZh = [
  ["首页", "./", "home"],
  ["文章", "articles/", "articles"],
  ["图集", "gallery/", "gallery"],
  ["视频", "videos/", "videos"],
  ["联系", "contact/", "contact"],
  ["关于", "about/", "about"],
];

const navEn = [
  ["Home", "./", "home"],
  ["Articles", "articles/", "articles"],
  ["Gallery", "gallery/", "gallery"],
  ["Videos", "videos/", "videos"],
  ["Contact", "contact/", "contact"],
  ["About", "about/", "about"],
];

/** 从页面回到站点根（含 assets/、favicon）需向上的层数；depth 2/3 实际都在 lang 下两级目录 */
function relUpCount(depth) {
  return depth <= 1 ? 1 : 2;
}

function relPrefix(depth) {
  return "../".repeat(relUpCount(depth));
}

function relToAssets(depth) {
  return `${relPrefix(depth)}assets`;
}

function relToRoot(depth) {
  return relPrefix(depth);
}

/** 从当前页回到所在语言目录 zh/ 或 en/（depth 2、3 均为 ../） */
function langBase(depth) {
  return depth <= 1 ? "" : "../";
}

/** 切换到另一语言的 mirror 页面（与 depth 无关） */
function crossLangHref(toLang, mirrorPath) {
  return `../${toLang}/${mirrorPath || ""}`;
}

function head(lang, depth, meta) {
  const { title, desc, canonical, hreflang, extra = "" } = meta;
  const type = meta.type || "website";
  const assets = relToAssets(depth);
  const r = relToRoot(depth);
  const altZh = hreflang?.zh || canonical.replace(/\/en\//, "/zh/");
  const altEn = hreflang?.en || canonical.replace(/\/zh\//, "/en/");
  return `<!DOCTYPE html>
<html lang="${lang === "zh" ? "zh-Hans" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="zh" href="${altZh}">
  <link rel="alternate" hreflang="en" href="${altEn}">
  <link rel="alternate" hreflang="x-default" href="${altZh}">
  <link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="${r}site.webmanifest">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="aoglang">
  <meta property="og:title" content="${title.replace(/ —.*/, "").replace(/ \|.*/, "")}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE}/assets/img/og-default.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="${assets}/css/main.css">
  ${extra}
</head>`;
}

function header(lang, depth, active, altPage) {
  const assets = relToAssets(depth);
  const nav = lang === "zh" ? navZh : navEn;
  const skip = lang === "zh" ? "跳到主要内容" : "Skip to main content";
  const menuLabel = lang === "zh" ? "打开菜单" : "Open menu";
  const otherLang = lang === "zh" ? "en" : "zh";
  const otherLabel = lang === "zh" ? "EN" : "中文";
  const homeHref = relToRoot(depth) + otherLang + "/" + (altPage || "");
  const logoHref = lang === "zh" && depth === 1 ? "./" : depth === 1 ? "./" : "../".repeat(depth - 1 - (depth > 2 ? 0 : 0));

  let base = "";
  if (depth === 1) base = "";
  else if (depth === 2) base = "../";
  else if (depth === 3) base = "../../";

  const navItems = nav
    .map(([label, href, key]) => {
      const cur = key === active ? ' aria-current="page"' : "";
      return `<li><a href="${navLink(base, href)}"${cur}>${label}</a></li>`;
    })
    .join("\n          ");

  const drawerItems = nav
    .map(([label, href]) => `<li><a href="${navLink(base, href)}">${label}</a></li>`)
    .join("\n        ");

  return `  <a class="skip-link" href="#main">${skip}</a>
  <header class="site-header">
    <div class="header-wrap">
      <div class="header-inner">
        <a class="logo" href="${base || "./"}">
          <img src="${assets}/img/logo.svg" width="32" height="32" alt="aoglang">
          <span>aoglang</span>
        </a>
        <nav aria-label="${lang === "zh" ? "主导航" : "Main"}">
          <ul class="nav-main">
            ${navItems}
          </ul>
        </nav>
        <div class="header-actions">
          <div class="lang-switch">
            <a href="${zhHref}" hreflang="zh" ${lang === "zh" ? 'aria-current="true"' : ""}>中文</a>
            <a href="${enHref}" hreflang="en" ${lang === "en" ? 'aria-current="true"' : ""}>EN</a>
          </div>
          <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="nav-drawer" aria-label="${menuLabel}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>
      <nav id="nav-drawer" class="nav-drawer" hidden aria-label="${lang === "zh" ? "移动端菜单" : "Mobile menu"}">
        <ul>
          ${drawerItems}
          <li><a href="${homeHref}">${otherLabel}</a></li>
        </ul>
      </nav>
    </div>
  </header>`;
}

function footer(lang, depth) {
  const base = langBase(depth);
  if (lang === "zh") {
    return `  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <strong>aoglang</strong>
        <p>分享文章、图片与视频</p>
      </div>
      <nav class="footer-nav" aria-label="页脚导航">
        <a href="${base}articles/">文章</a>
        <a href="${base}gallery/">图集</a>
        <a href="${base}videos/">视频</a>
        <a href="${base}contact/">联系</a>
      </nav>
      <div class="footer-legal">
        <p>© <span data-year>2026</span> aoglang</p>
        <p><a href="${base}privacy/">隐私政策</a> · <a href="${base}terms/">使用条款</a> · <span class="feed-link"><a href="${base}feed.xml">RSS</a></span> · <a href="${relToRoot(depth)}sitemap.xml">网站地图</a></p>
      </div>
    </div>
  </footer>
  <script src="${relToAssets(depth)}/js/main.js" defer></script>
  <script src="${relToAssets(depth)}/js/masonry.js" defer></script>`;
  }
  return `  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <strong>aoglang</strong>
        <p>Articles, galleries &amp; videos</p>
      </div>
      <nav class="footer-nav" aria-label="Footer">
        <a href="${base}articles/">Articles</a>
        <a href="${base}gallery/">Gallery</a>
        <a href="${base}videos/">Videos</a>
        <a href="${base}contact/">Contact</a>
      </nav>
      <div class="footer-legal">
        <p>© <span data-year>2026</span> aoglang</p>
        <p><a href="${base}privacy/">Privacy</a> · <a href="${base}terms/">Terms</a> · <span class="feed-link"><a href="${base}feed.xml">RSS</a></span> · <a href="${relToRoot(depth)}sitemap.xml">Sitemap</a></p>
      </div>
    </div>
  </footer>
  <script src="${relToAssets(depth)}/js/main.js" defer></script>
  <script src="${relToAssets(depth)}/js/masonry.js" defer></script>`;
}

function write(file, content) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("wrote", file);
}

// Fix lang switch links in header - need proper cross-lang URLs
function headerFixed(lang, depth, active, mirrorPath) {
  const assets = relToAssets(depth);
  const base = langBase(depth);
  const nav = lang === "zh" ? navZh : navEn;
  const skip = lang === "zh" ? "跳到主要内容" : "Skip to main content";
  const menuLabel = lang === "zh" ? "打开菜单" : "Open menu";
  const zhHref = crossLangHref("zh", mirrorPath);
  const enHref = crossLangHref("en", mirrorPath);

  const navItems = nav
    .map(([label, href, key]) => {
      const cur = key === active ? ' aria-current="page"' : "";
      return `<li><a href="${navLink(base, href)}"${cur}>${label}</a></li>`;
    })
    .join("\n          ");

  const drawerItems = nav
    .map(([label, href]) => `<li><a href="${navLink(base, href)}">${label}</a></li>`)
    .join("\n        ");

  return `  <a class="skip-link" href="#main">${skip}</a>
  <header class="site-header">
    <div class="header-wrap">
      <div class="header-inner">
        <a class="logo" href="${base || "./"}">
          <img src="${assets}/img/logo.svg" width="32" height="32" alt="aoglang">
          <span>aoglang</span>
        </a>
        <nav aria-label="${lang === "zh" ? "主导航" : "Main"}">
          <ul class="nav-main">
            ${navItems}
          </ul>
        </nav>
        <div class="header-actions">
          <div class="lang-switch">
            <a href="${zhHref}" hreflang="zh" ${lang === "zh" ? 'aria-current="true"' : ""}>中文</a>
            <a href="${enHref}" hreflang="en" ${lang === "en" ? 'aria-current="true"' : ""}>EN</a>
          </div>
          <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="nav-drawer" aria-label="${menuLabel}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>
      <nav id="nav-drawer" class="nav-drawer" hidden aria-label="${lang === "zh" ? "移动端菜单" : "Mobile menu"}">
        <ul>
          ${drawerItems}
          <li><a href="${lang === "zh" ? enHref : zhHref}">${lang === "zh" ? "English" : "中文"}</a></li>
        </ul>
      </nav>
    </div>
  </header>`;
}

function page(lang, depth, active, mirrorPath, meta, body, opts = {}) {
  const canonical = meta.canonical;
  const extra = meta.extra || "";
  const assets = relToAssets(depth);
  const bodyClass = opts.bodyClass ? ` class="${opts.bodyClass}"` : "";
  const bodyAttrs = opts.bodyAttrs ? ` ${opts.bodyAttrs}` : "";
  const extraScripts = (opts.extraScripts || [])
    .map((s) => `  <script src="${assets}/js/${s}" defer></script>`)
    .join("\n");
  return `${head(lang, depth, { ...meta, canonical, extra })}
<body${bodyClass}${bodyAttrs}>
${headerFixed(lang, depth, active, mirrorPath)}
  <main id="main">
${body}
  </main>
${footer(lang, depth)}
${extraScripts}
</body>
</html>
`;
}

function cardThumbAttr(w, h) {
  const ratio = w / h;
  let ar = "4 / 3";
  if (ratio >= 1.6) ar = "16 / 9";
  else if (ratio >= 1.15) ar = "4 / 3";
  else if (ratio >= 0.85) ar = "1 / 1";
  else ar = "3 / 4";
  return ` style="--thumb-ar: ${ar}"`;
}

function navLink(base, href) {
  if (href === "./" || href === "") return base || "./";
  return `${base}${href}`;
}

/** 整张卡片可点击（缩略图 + 标题区域） */
function cardArticle({ thumbStyle, imgSrc, imgW, imgH, imgAlt, href, heading, meta, tag = "h2" }) {
  return `<article class="card"${thumbStyle}><a class="card-anchor" href="${href}"><img class="card-thumb" src="${imgSrc}" width="${imgW}" height="${imgH}" alt="${imgAlt}" loading="lazy"><div class="card-body"><${tag}>${heading}</${tag}><p class="card-meta">${meta}</p></div></a></article>`;
}

function homeHeroSearch(isZh) {
  if (isZh) {
    return `    <div class="search-screen home-search-screen">
      <section class="hero hero-first-screen" id="search">
        <h1>分享你所热爱的内容</h1>
        <p class="search-tagline">搜索文章、图集与视频</p>
        <form id="search-form" class="search-form-large" role="search" action="./" method="get">
          <label for="search-input" class="visually-hidden">搜索关键词</label>
          <div class="search-input-wrap">
            <svg class="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            <input type="search" id="search-input" name="q" placeholder="搜索文章、图集、视频…" autocomplete="off" enterkeyhint="search">
            <button type="submit" class="search-submit">搜索</button>
          </div>
        </form>
        <p class="search-hints">按 <kbd>/</kbd> 快速聚焦</p>
        <div id="search-browse" class="search-browse">
          <h2>热门内容</h2>
          <ul class="search-browse-list"></ul>
        </div>
      </section>
      <div id="search-panel" class="search-panel home-search-panel" hidden>
        <p id="search-status" class="search-status" hidden></p>
        <p id="search-empty" class="search-empty" hidden>未找到匹配内容，请换关键词试试。</p>
        <ul id="search-results" class="search-results"></ul>
      </div>
    </div>`;
  }
  return `    <div class="search-screen home-search-screen">
      <section class="hero hero-first-screen" id="search">
        <h1>Share what you love</h1>
        <p class="search-tagline">Search articles, galleries &amp; videos</p>
        <form id="search-form" class="search-form-large" role="search" action="./" method="get">
          <label for="search-input" class="visually-hidden">Search keywords</label>
          <div class="search-input-wrap">
            <svg class="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            <input type="search" id="search-input" name="q" placeholder="Search articles, galleries, videos…" autocomplete="off" enterkeyhint="search">
            <button type="submit" class="search-submit">Search</button>
          </div>
        </form>
        <p class="search-hints">Press <kbd>/</kbd> to focus</p>
        <div id="search-browse" class="search-browse">
          <h2>Popular</h2>
          <ul class="search-browse-list"></ul>
        </div>
      </section>
      <div id="search-panel" class="search-panel home-search-panel" hidden>
        <p id="search-status" class="search-status" hidden></p>
        <p id="search-empty" class="search-empty" hidden>No results found. Try different keywords.</p>
        <ul id="search-results" class="search-results"></ul>
      </div>
    </div>`;
}

// --- Home zh ---
write(
  "zh/index.html",
  page(
    "zh",
    1,
    "home",
    "",
    {
      title: "aoglang — 分享文章、图片与视频",
      desc: "aoglang 内容分享站：文章、图集与视频，纯 HTML 静态站，SEO 友好，支持手机与电脑。",
      canonical: `${SITE}/zh/`,
      extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"aoglang","url":"${SITE}/zh/","inLanguage":"zh-Hans","potentialAction":{"@type":"SearchAction","target":"${SITE}/zh/?q={search_term_string}","query-input":"required name=search_term_string"}}</script>`,
    },
    `${homeHeroSearch(true)}
    <div class="home-content" id="content">
    <h2 class="section-title">最新内容</h2>
    <div class="masonry-grid">
      ${cardArticle({
        thumbStyle: cardThumbAttr(1920, 1080),
        imgSrc: "../assets/img/gallery/wqd/wqd-01.png",
        imgW: 1920,
        imgH: 1080,
        imgAlt: "无穷符号 3D 视觉图集",
        href: "gallery/infinity-3d.html",
        heading: "无穷符号 3D 视觉",
        meta: '<span class="tag">图集</span>10 张',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(640, 360),
        imgSrc: "../assets/img/placeholder.svg",
        imgW: 640,
        imgH: 360,
        imgAlt: "欢迎来到 aoglang 文章封面",
        href: "articles/welcome-aoglang.html",
        heading: "欢迎来到 aoglang",
        meta: '<span class="tag">文章</span>2026-05-27',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(800, 600),
        imgSrc: "../assets/img/gallery/spring-1.svg",
        imgW: 800,
        imgH: 600,
        imgAlt: "春日图集封面",
        href: "gallery/spring-scenes.html",
        heading: "春日图集",
        meta: '<span class="tag">图集</span>6 张',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(1280, 720),
        imgSrc: "../assets/img/video-poster.svg",
        imgW: 1280,
        imgH: 720,
        imgAlt: "认识 aoglang 视频封面",
        href: "videos/intro-aoglang.html",
        heading: "认识 aoglang",
        meta: '<span class="tag">视频</span>HTML5',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(640, 360),
        imgSrc: "../assets/img/placeholder.svg",
        imgW: 640,
        imgH: 360,
        imgAlt: "静态网站搭建指南",
        href: "articles/static-site-guide.html",
        heading: "静态网站搭建指南",
        meta: '<span class="tag">文章</span>2026-05-26',
        tag: "h3",
      })}
    </div>
    </div>`,
    {
      bodyClass: "page-home-search",
      bodyAttrs: 'data-lang="zh" data-search-index="../assets/data/search-index.json" data-search-base=""',
      extraScripts: ["search.js"],
    }
  )
);

write(
  "en/index.html",
  page(
    "en",
    1,
    "home",
    "",
    {
      title: "aoglang — Articles, galleries &amp; videos",
      desc: "aoglang shares articles, photo galleries and videos. Static HTML, SEO-friendly, bilingual.",
      canonical: `${SITE}/en/`,
      extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"aoglang","url":"${SITE}/en/","inLanguage":"en","potentialAction":{"@type":"SearchAction","target":"${SITE}/en/?q={search_term_string}","query-input":"required name=search_term_string"}}</script>`,
    },
    `${homeHeroSearch(false)}
    <div class="home-content" id="content">
    <h2 class="section-title">Latest</h2>
    <div class="masonry-grid">
      ${cardArticle({
        thumbStyle: cardThumbAttr(1920, 1080),
        imgSrc: "../assets/img/gallery/wqd/wqd-01.png",
        imgW: 1920,
        imgH: 1080,
        imgAlt: "Infinity 3D visual gallery",
        href: "gallery/infinity-3d.html",
        heading: "Infinity 3D visuals",
        meta: '<span class="tag">Gallery</span>10 images',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(640, 360),
        imgSrc: "../assets/img/placeholder.svg",
        imgW: 640,
        imgH: 360,
        imgAlt: "Welcome to aoglang article cover",
        href: "articles/welcome-aoglang.html",
        heading: "Welcome to aoglang",
        meta: '<span class="tag">Article</span>2026-05-27',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(800, 600),
        imgSrc: "../assets/img/gallery/spring-1.svg",
        imgW: 800,
        imgH: 600,
        imgAlt: "Spring scenes gallery cover",
        href: "gallery/spring-scenes.html",
        heading: "Spring scenes",
        meta: '<span class="tag">Gallery</span>6 photos',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(1280, 720),
        imgSrc: "../assets/img/video-poster.svg",
        imgW: 1280,
        imgH: 720,
        imgAlt: "Intro to aoglang video cover",
        href: "videos/intro-aoglang.html",
        heading: "Intro to aoglang",
        meta: '<span class="tag">Video</span>HTML5',
        tag: "h3",
      })}
      ${cardArticle({
        thumbStyle: cardThumbAttr(640, 360),
        imgSrc: "../assets/img/placeholder.svg",
        imgW: 640,
        imgH: 360,
        imgAlt: "Static site guide",
        href: "articles/static-site-guide.html",
        heading: "Static site guide",
        meta: '<span class="tag">Article</span>2026-05-26',
        tag: "h3",
      })}
    </div>
    </div>`,
    {
      bodyClass: "page-home-search",
      bodyAttrs: 'data-lang="en" data-search-index="../assets/data/search-index.json" data-search-base=""',
      extraScripts: ["search.js"],
    }
  )
);

// Articles list
for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  write(
    `${lang}/articles/index.html`,
    page(lang, 2, "articles", "articles/", {
      title: isZh ? "文章 — aoglang" : "Articles — aoglang",
      desc: isZh ? "浏览 aoglang 全部文章。" : "All articles on aoglang.",
      canonical: `${SITE}/${lang}/articles/`,
    }, isZh
      ? `    <h1>文章</h1>
    <div class="masonry-grid">
      <article class="card"><img class="card-thumb" src="../../assets/img/placeholder.svg" alt="" loading="lazy"><div class="card-body"><h2><a href="welcome-aoglang.html">欢迎来到 aoglang</a></h2><p class="card-meta">2026-05-27</p></div></article>
      <article class="card"><img class="card-thumb" src="../../assets/img/placeholder.svg" alt="" loading="lazy"><div class="card-body"><h2><a href="static-site-guide.html">静态网站搭建指南</a></h2><p class="card-meta">2026-05-26</p></div></article>
    </div>`
      : `    <h1>Articles</h1>
    <div class="masonry-grid">
      <article class="card"><img class="card-thumb" src="../../assets/img/placeholder.svg" alt="" loading="lazy"><div class="card-body"><h2><a href="welcome-aoglang.html">Welcome to aoglang</a></h2><p class="card-meta">2026-05-27</p></div></article>
      <article class="card"><img class="card-thumb" src="../../assets/img/placeholder.svg" alt="" loading="lazy"><div class="card-body"><h2><a href="static-site-guide.html">Static site guide</a></h2><p class="card-meta">2026-05-26</p></div></article>
    </div>`)
  );
}

// Article: welcome
const welcomeZh = `    <ol class="breadcrumb"><li><a href="../">首页</a></li><li><a href="./">文章</a></li><li aria-current="page">欢迎来到 aoglang</li></ol>
    <header class="article-header"><h1>欢迎来到 aoglang</h1><p class="card-meta">2026-05-27 · <a href="${crossLangHref("en", "articles/welcome-aoglang.html")}" hreflang="en">English</a></p></header>
    <article class="prose">
      <p>本站是<strong>纯 HTML 静态站</strong>：无数据库、无 PHP，适合个人或小团队内容分享。每种语言使用独立页面，利于 SEO。</p>
      <h2>你能在这里找到什么</h2>
      <ul><li><strong>文章</strong>：教程、随笔、长文</li><li><strong>图集</strong>：多图展示，配中英文说明</li><li><strong>视频</strong>：HTML5 自托管或嵌入 B站 / YouTube</li></ul>
      <h2>下一步</h2>
      <p>阅读<a href="static-site-guide.html">静态网站搭建指南</a>，或浏览<a href="../gallery/spring-scenes.html">春日图集</a>示例。</p>
    </article>`;
const welcomeEn = `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Articles</a></li><li aria-current="page">Welcome to aoglang</li></ol>
    <header class="article-header"><h1>Welcome to aoglang</h1><p class="card-meta">2026-05-27 · <a href="${crossLangHref("zh", "articles/welcome-aoglang.html")}" hreflang="zh">中文版</a></p></header>
    <article class="prose">
      <p>This is a <strong>pure HTML static site</strong>—no database, no PHP. Each language has its own URLs for better SEO.</p>
      <h2>What you'll find</h2>
      <ul><li><strong>Articles</strong>—guides and long reads</li><li><strong>Galleries</strong>—photos with bilingual captions</li><li><strong>Videos</strong>—HTML5 or embedded players</li></ul>
      <h2>Next steps</h2>
      <p>Read the <a href="static-site-guide.html">static site guide</a> or view the <a href="../gallery/spring-scenes.html">spring gallery</a>.</p>
    </article>`;

write("zh/articles/welcome-aoglang.html", page("zh", 3, "articles", "articles/welcome-aoglang.html", {
  title: "欢迎来到 aoglang — 文章",
  desc: "了解 aoglang 纯 HTML 双语内容站。",
  canonical: `${SITE}/zh/articles/welcome-aoglang.html`,
  type: "article",
  extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"欢迎来到 aoglang","datePublished":"2026-05-27","inLanguage":"zh-Hans"}</script>`,
}, welcomeZh));

write("en/articles/welcome-aoglang.html", page("en", 3, "articles", "articles/welcome-aoglang.html", {
  title: "Welcome to aoglang — Article",
  desc: "About the aoglang bilingual static site.",
  canonical: `${SITE}/en/articles/welcome-aoglang.html`,
  type: "article",
  extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"Welcome to aoglang","datePublished":"2026-05-27","inLanguage":"en"}</script>`,
}, welcomeEn));

const guideZh = `    <ol class="breadcrumb"><li><a href="../">首页</a></li><li><a href="./">文章</a></li><li aria-current="page">静态网站搭建指南</li></ol>
    <header class="article-header"><h1>静态网站搭建指南</h1><p class="card-meta">2026-05-26 · <a href="${crossLangHref("en", "articles/static-site-guide.html")}" hreflang="en">English</a></p></header>
    <article class="prose">
      <h2>目录结构</h2>
      <pre><code>zh/  en/  assets/  sitemap.xml  robots.txt</code></pre>
      <h2>每篇新文章 checklist</h2>
      <ol>
        <li>复制文章模板，填写 title、description、canonical</li>
        <li>添加 hreflang 指向另一语言版本</li>
        <li>在 zh/articles/index.html 与 en 列表中加入链接</li>
        <li>更新 sitemap.xml 与 feed.xml</li>
        <li>在 assets/data/search-index.json 增加条目</li>
      </ol>
      <h2>图片与性能</h2>
      <p>使用 WebP/AVIF、<code>loading="lazy"</code>、有意义的 <code>alt</code>。视频大文件建议外链 CDN。</p>
    </article>`;
const guideEn = `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Articles</a></li><li aria-current="page">Static site guide</li></ol>
    <header class="article-header"><h1>Static site guide</h1><p class="card-meta">2026-05-26 · <a href="${crossLangHref("zh", "articles/static-site-guide.html")}" hreflang="zh">中文版</a></p></header>
    <article class="prose">
      <h2>Folder layout</h2>
      <pre><code>zh/  en/  assets/  sitemap.xml  robots.txt</code></pre>
      <h2>New article checklist</h2>
      <ol>
        <li>Copy template; set title, description, canonical</li>
        <li>Add hreflang to the other language</li>
        <li>Link from both article index pages</li>
        <li>Update sitemap.xml and feed.xml</li>
        <li>Add entry to search-index.json</li>
      </ol>
    </article>`;

write("zh/articles/static-site-guide.html", page("zh", 3, "articles", "articles/static-site-guide.html", {
  title: "静态网站搭建指南 — aoglang",
  desc: "纯 HTML 站点目录、SEO 与发布清单。",
  canonical: `${SITE}/zh/articles/static-site-guide.html`,
  type: "article",
}, guideZh));
write("en/articles/static-site-guide.html", page("en", 3, "articles", "articles/static-site-guide.html", {
  title: "Static site guide — aoglang",
  desc: "Folder structure, SEO and publishing checklist.",
  canonical: `${SITE}/en/articles/static-site-guide.html`,
  type: "article",
}, guideEn));

// Gallery — WQD 无穷符号 3D 图集（upload/picture）
const WQD_GALLERY = [
  {
    file: "wqd-01.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "铜色金属无穷环",
      desc: "暖米色背景上的抛光铜色三维无穷符号，柔光勾勒金属质感，寓意连续与永恒。",
      keywords: ["无穷符号", "3D", "金属", "铜色", "抽象", "aoglang"],
    },
    en: {
      title: "Copper metallic infinity",
      desc: "A polished copper 3D infinity loop on a warm beige backdrop with soft studio lighting.",
      keywords: ["infinity", "3D", "metallic", "copper", "abstract", "aoglang"],
    },
  },
  {
    file: "wqd-02.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "橙金螺旋缎带",
      desc: "多层光泽缎带扭转成螺旋形态，橙金渐变与高光强调流动感与现代感。",
      keywords: ["螺旋", "缎带", "橙色", "3D渲染", "抽象", "动态"],
    },
    en: {
      title: "Orange-gold spiral ribbons",
      desc: "Glossy layered ribbons twist into a dynamic spiral with warm orange and gold highlights.",
      keywords: ["spiral", "ribbon", "orange", "3D render", "abstract", "dynamic"],
    },
  },
  {
    file: "wqd-03.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "橙色波浪层叠",
      desc: "平行光泽带层叠扭转，形成波浪式无穷动线，深影与高对比塑造立体层次。",
      keywords: ["波浪", "层叠", "橙色", "光泽", "流体", "3D"],
    },
    en: {
      title: "Layered orange waves",
      desc: "Parallel glossy bands layer and twist into a fluid wave-like infinity motion.",
      keywords: ["wave", "layers", "orange", "glossy", "fluid", "3D"],
    },
  },
  {
    file: "wqd-04.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "渐变背景螺旋",
      desc: "粗壮橙色缎带螺旋盘绕，背景由暖黄过渡到浅蓝，冷暖对比突出主体。",
      keywords: ["螺旋", "渐变背景", "橙色", "极简", "构图", "3D艺术"],
    },
    en: {
      title: "Spiral on gradient sky",
      desc: "Bold orange helical ribbons against a soft yellow-to-blue gradient background.",
      keywords: ["spiral", "gradient", "orange", "minimal", "composition", "3D art"],
    },
  },
  {
    file: "wqd-05.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "双色光影无穷环",
      desc: "黑色背景上的镀铬无穷符号，左侧暖金、右侧冷蓝双色照明，科技感强烈。",
      keywords: ["无穷符号", "镀铬", "双色光", "黑色背景", "科技", "未来感"],
    },
    en: {
      title: "Dual-lit chrome infinity",
      desc: "Chrome infinity on black with warm gold left and cool blue right lighting.",
      keywords: ["infinity", "chrome", "dual lighting", "black background", "tech", "futuristic"],
    },
  },
  {
    file: "wqd-06.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "青绿渐变扭曲环",
      desc: "多层薄带扭转成莫比乌斯式无穷结构，青绿到青蓝渐变，金属光泽细腻。",
      keywords: ["青绿", "渐变", "莫比乌斯", "无穷", "金属", "抽象雕塑"],
    },
    en: {
      title: "Teal gradient twist",
      desc: "Layered ribbons form a Möbius-like infinity with lime-to-cyan metallic gradients.",
      keywords: ["teal", "gradient", "Möbius", "infinity", "metallic", "sculpture"],
    },
  },
  {
    file: "wqd-07.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "哑光橙无穷符号",
      desc: "简洁哑光橙色三维无穷环，置于浅色平面，轻阴影呈现干净极简风格。",
      keywords: ["哑光", "橙色", "极简", "无穷符号", "图标", "现代"],
    },
    en: {
      title: "Matte orange infinity",
      desc: "Clean matte orange 3D infinity icon on a light surface with soft shadow.",
      keywords: ["matte", "orange", "minimal", "infinity", "icon", "modern"],
    },
  },
  {
    file: "wqd-08.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "单色橙铜无穷",
      desc: "同色系橙铜金属无穷符号，背景与主体色调统一，强调形态与材质细节。",
      keywords: ["单色", "橙铜", "金属", "无穷", "极简", "品牌视觉"],
    },
    en: {
      title: "Monochrome copper-orange",
      desc: "Monochromatic metallic infinity in copper-orange tones on a matching backdrop.",
      keywords: ["monochrome", "copper", "metallic", "infinity", "minimal", "branding"],
    },
  },
  {
    file: "wqd-09.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "层叠橙带无穷",
      desc: "多层薄带堆叠扭转成无穷结，全橙色调中通过明暗展现立体结构。",
      keywords: ["层叠", "薄带", "橙色", "无穷符号", "3D", "光泽"],
    },
    en: {
      title: "Layered orange infinity",
      desc: "Stacked thin ribbons twist into an infinity knot with depth via orange highlights.",
      keywords: ["layered", "ribbons", "orange", "infinity", "3D", "glossy"],
    },
  },
  {
    file: "wqd-10.png",
    w: 1920,
    h: 1080,
    zh: {
      title: "虹彩玻璃方块无穷",
      desc: "半透明方块螺旋砌成无穷环，虹彩折射如水晶玻璃，轻盈且富有未来感。",
      keywords: ["虹彩", "玻璃", "半透明", "无穷", "方块", "未来"],
    },
    en: {
      title: "Iridescent glass blocks",
      desc: "Translucent blocks spiral into an infinity loop with rainbow iridescent refractions.",
      keywords: ["iridescent", "glass", "translucent", "infinity", "blocks", "futuristic"],
    },
  },
];

const INFINITY_SLUG = "infinity-3d";

function wqdFiguresHtml(lang, assetPrefix) {
  const isZh = lang === "zh";
  return WQD_GALLERY.map((item) => {
    const loc = isZh ? item.zh : item.en;
    const tags = loc.keywords.map((k) => `<span class="tag">${k}</span>`).join("");
    const ar = cardThumbAttr(item.w, item.h).replace(' style="', "").replace('"', "");
    return `<figure${cardThumbAttr(item.w, item.h)}>
        <img src="${assetPrefix}assets/img/gallery/wqd/${item.file}" width="${item.w}" height="${item.h}" alt="${loc.title}" loading="lazy" decoding="async">
        <figcaption>
          <strong>${loc.title}</strong>
          <p>${loc.desc}</p>
          <p class="gallery-keywords">${tags}</p>
        </figcaption>
      </figure>`;
  }).join("\n      ");
}

function galleryIndexCards(isZh) {
  const spring = cardArticle({
    thumbStyle: cardThumbAttr(800, 600),
    imgSrc: "../../assets/img/gallery/spring-1.svg",
    imgW: 800,
    imgH: 600,
    imgAlt: isZh ? "春日图集" : "Spring scenes",
    href: "spring-scenes.html",
    heading: isZh ? "春日图集" : "Spring scenes",
    meta: isZh ? '<span class="tag">示例</span>6 张' : '<span class="tag">Demo</span>6 photos',
  });
  const infinity = cardArticle({
    thumbStyle: cardThumbAttr(1920, 1080),
    imgSrc: "../../assets/img/gallery/wqd/wqd-01.png",
    imgW: 1920,
    imgH: 1080,
    imgAlt: isZh ? "无穷符号 3D 视觉图集" : "Infinity 3D visual gallery",
    href: `${INFINITY_SLUG}.html`,
    heading: isZh ? "无穷符号 3D 视觉" : "Infinity 3D visuals",
    meta: isZh
      ? '<span class="tag">图集</span>10 张 · 关键词'
      : '<span class="tag">Gallery</span>10 images · keywords',
  });
  return `${infinity}\n      ${spring}`;
}

for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  write(`${lang}/gallery/index.html`, page(lang, 2, "gallery", "gallery/", {
    title: isZh ? "图集 — aoglang" : "Gallery — aoglang",
    desc: isZh ? "图片与 3D 视觉图集，含说明与关键词。" : "Photo and 3D visual galleries with captions and keywords.",
    canonical: `${SITE}/${lang}/gallery/`,
  }, `    <h1>${isZh ? "图集" : "Gallery"}</h1>
    <div class="masonry-grid">${galleryIndexCards(isZh)}</div>`));

  const cap = (n) => (isZh ? `春日景象 ${n}` : `Spring scene ${n}`);
  const figs = [1, 2, 3, 4, 5, 6]
    .map(
      (n) =>
        `<figure><img src="${relPrefix(3)}assets/img/gallery/spring-${n}.svg" width="800" height="600" alt="${cap(n)}" loading="lazy"><figcaption>${cap(n)}</figcaption></figure>`
    )
    .join("\n      ");

  write(
    `${lang}/gallery/spring-scenes.html`,
    page(lang, 3, "gallery", "gallery/spring-scenes.html", {
      title: isZh ? "春日图集 — aoglang" : "Spring scenes — aoglang",
      desc: isZh ? "六张示例摄影图集，含中英文说明。" : "Sample gallery with six photos and captions.",
      canonical: `${SITE}/${lang}/gallery/spring-scenes.html`,
    }, isZh
      ? `    <ol class="breadcrumb"><li><a href="../">首页</a></li><li><a href="./">图集</a></li><li aria-current="page">春日图集</li></ol>
    <header class="article-header"><h1>春日图集</h1><p class="card-meta"><a href="${crossLangHref("en", "gallery/spring-scenes.html")}" hreflang="en">English</a></p></header>
    <div class="gallery-grid prose-wide">${figs}</div>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Gallery</a></li><li aria-current="page">Spring scenes</li></ol>
    <header class="article-header"><h1>Spring scenes</h1><p class="card-meta"><a href="${crossLangHref("zh", "gallery/spring-scenes.html")}" hreflang="zh">中文版</a></p></header>
    <div class="gallery-grid prose-wide">${figs}</div>`
    )
  );

  const wqdFigs = wqdFiguresHtml(lang, relPrefix(3));
  const metaZh = {
    title: "无穷符号 3D 视觉图集 — aoglang",
    desc: "十张无穷符号主题 3D 视觉作品，附中文说明与搜索关键词。",
    intro: "来自 upload 图库的三维无穷符号与缎带抽象视觉，每张配有说明与关键词，便于检索与分享。",
    h1: "无穷符号 3D 视觉",
  };
  const metaEn = {
    title: "Infinity 3D visual gallery — aoglang",
    desc: "Ten infinity-themed 3D visuals with captions and searchable keywords.",
    intro: "Abstract infinity loops and ribbons with bilingual captions and tags for search and sharing.",
    h1: "Infinity 3D visuals",
  };
  const m = isZh ? metaZh : metaEn;
  const otherLang = isZh ? "en" : "zh";
  const otherLabel = isZh ? "English" : "中文版";

  write(
    `${lang}/gallery/${INFINITY_SLUG}.html`,
    page(lang, 3, "gallery", `gallery/${INFINITY_SLUG}.html`, {
      title: m.title,
      desc: m.desc,
      canonical: `${SITE}/${lang}/gallery/${INFINITY_SLUG}.html`,
      type: "article",
      extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"ImageGallery","name":"${m.h1}","description":"${m.desc}","inLanguage":"${isZh ? "zh-Hans" : "en"}"}</script>`,
    }, `    <ol class="breadcrumb"><li><a href="../">${isZh ? "首页" : "Home"}</a></li><li><a href="./">${isZh ? "图集" : "Gallery"}</a></li><li aria-current="page">${m.h1}</li></ol>
    <header class="article-header">
      <h1>${m.h1}</h1>
      <p class="card-meta">${isZh ? "10 张" : "10 images"} · <a href="${crossLangHref(otherLang, `gallery/${INFINITY_SLUG}.html`)}" hreflang="${otherLang}">${otherLabel}</a></p>
      <p class="gallery-intro">${m.intro}</p>
    </header>
    <div class="gallery-grid prose-wide">${wqdFigs}</div>`
    )
  );
}

// Videos
for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  write(`${lang}/videos/index.html`, page(lang, 2, "videos", "videos/", {
    title: isZh ? "视频 — aoglang" : "Videos — aoglang",
    desc: isZh ? "视频分享与播放。" : "Videos on aoglang.",
    canonical: `${SITE}/${lang}/videos/`,
  }, isZh
    ? `    <h1>视频</h1><div class="masonry-grid"><article class="card"><img class="card-thumb" src="../../assets/img/video-poster.svg" alt="认识 aoglang" loading="lazy"><div class="card-body"><h2><a href="intro-aoglang.html">认识 aoglang</a></h2><p class="card-meta">HTML5 示例</p></div></article></div>`
    : `    <h1>Videos</h1><div class="masonry-grid"><article class="card"><img class="card-thumb" src="../../assets/img/video-poster.svg" alt="Intro" loading="lazy"><div class="card-body"><h2><a href="intro-aoglang.html">Intro to aoglang</a></h2><p class="card-meta">HTML5 demo</p></div></article></div>`));

  write(
    `${lang}/videos/intro-aoglang.html`,
    page(lang, 3, "videos", "videos/intro-aoglang.html", {
      title: isZh ? "认识 aoglang — 视频" : "Intro to aoglang — Video",
      desc: isZh ? "HTML5 视频播放示例。" : "HTML5 video playback demo.",
      canonical: `${SITE}/${lang}/videos/intro-aoglang.html`,
      extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"VideoObject","name":"${isZh ? "认识 aoglang" : "Intro to aoglang"}","uploadDate":"2026-05-27"}</script>`,
    }, isZh
      ? `    <ol class="breadcrumb"><li><a href="../">首页</a></li><li><a href="./">视频</a></li><li aria-current="page">认识 aoglang</li></ol>
    <header class="article-header"><h1>认识 aoglang</h1><p class="card-meta"><a href="${crossLangHref("en", "videos/intro-aoglang.html")}" hreflang="en">English</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="${relPrefix(3)}assets/img/video-poster.svg">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        您的浏览器不支持视频播放。
      </video>
      <p>以上为示例视频（MDN 公共领域）。替换 <code>source</code> 为你的 mp4/webm 文件路径即可自托管。</p>
      <h2>嵌入 B站 / YouTube</h2>
      <div class="video-wrap"><iframe title="嵌入视频示例" src="https://www.youtube-nocookie.com/embed/EngW7bV5ING" loading="lazy" allowfullscreen></iframe></div>
    </article>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Videos</a></li><li aria-current="page">Intro</li></ol>
    <header class="article-header"><h1>Intro to aoglang</h1><p class="card-meta"><a href="${crossLangHref("zh", "videos/intro-aoglang.html")}" hreflang="zh">中文版</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="${relPrefix(3)}assets/img/video-poster.svg">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        Your browser does not support video.
      </video>
      <p>Sample video from MDN (public domain). Replace <code>source</code> URLs with your own files to self-host.</p>
      <h2>Embed YouTube / Bilibili</h2>
      <div class="video-wrap"><iframe title="Embedded video sample" src="https://www.youtube-nocookie.com/embed/EngW7bV5ING" loading="lazy" allowfullscreen></iframe></div>
    </article>`
    )
  );
}

// /search/ → 首页搜索区（兼容旧链接）
for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  write(
    `${lang}/search/index.html`,
    `<!DOCTYPE html>
<html lang="${isZh ? "zh-Hans" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=../#search">
  <link rel="canonical" href="${SITE}/${lang}/">
  <title>${isZh ? "正在跳转…" : "Redirecting…"}</title>
  <script>location.replace("../" + (location.search || "") + "#search");</script>
</head>
<body>
  <p><a href="../#search">${isZh ? "前往首页搜索" : "Go to home search"}</a></p>
</body>
</html>`
  );
}

// Contact
for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  write(
    `${lang}/contact/index.html`,
    page(lang, 2, "contact", "contact/", {
      title: isZh ? "联系我们 — aoglang" : "Contact — aoglang",
      desc: isZh ? "通过邮件或表单联系 aoglang。" : "Contact aoglang by email or form.",
      canonical: `${SITE}/${lang}/contact/`,
    },
    isZh
      ? `    <h1>联系我们</h1>
    <div class="prose">
      <p>邮箱：<a href="mailto:hello@aoglang.com">hello@aoglang.com</a></p>
      <form class="form" action="https://formsubmit.co/hello@aoglang.com" method="POST">
        <input type="hidden" name="_subject" value="aoglang 网站留言">
        <input type="hidden" name="_captcha" value="false">
        <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
        <label for="name">姓名</label>
        <input id="name" name="name" type="text" required>
        <label for="email">邮箱</label>
        <input id="email" name="email" type="email" required>
        <label for="message">留言</label>
        <textarea id="message" name="message" required></textarea>
        <button type="submit" class="btn">发送</button>
        <p class="form-note">表单由 FormSubmit 转发至邮箱。请将 hello@aoglang.com 改为你的真实邮箱，并在 FormSubmit 确认邮件中激活。</p>
      </form>
    </div>`
      : `    <h1>Contact</h1>
    <div class="prose">
      <p>Email: <a href="mailto:hello@aoglang.com">hello@aoglang.com</a></p>
      <form class="form" action="https://formsubmit.co/hello@aoglang.com" method="POST">
        <input type="hidden" name="_subject" value="aoglang contact">
        <input type="hidden" name="_captcha" value="false">
        <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
        <label for="name">Name</label>
        <input id="name" name="name" type="text" required>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required>
        <label for="message">Message</label>
        <textarea id="message" name="message" required></textarea>
        <button type="submit" class="btn">Send</button>
        <p class="form-note">Powered by FormSubmit. Replace hello@aoglang.com with your address and confirm via their activation email.</p>
      </form>
    </div>`
    )
  );
}

// About, privacy, terms
write("zh/about/index.html", page("zh", 2, "about", "about/", {
  title: "关于 — aoglang", desc: "关于 aoglang 内容分享站。", canonical: `${SITE}/zh/about/`,
}, `    <h1>关于 aoglang</h1><article class="prose"><p>aoglang 致力于用简洁、开放的静态网页分享文章、摄影与视频。全站双语，尊重访问者与搜索引擎。</p><p>内容版权归各作者所有；转载请注明出处。</p></article>`));
write("en/about/index.html", page("en", 2, "about", "about/", {
  title: "About — aoglang", desc: "About the aoglang content site.", canonical: `${SITE}/en/about/`,
}, `    <h1>About aoglang</h1><article class="prose"><p>aoglang shares articles, photos and videos through fast, accessible static HTML. Bilingual by design.</p><p>Content rights belong to respective authors; please credit when republishing.</p></article>`));

write("zh/privacy/index.html", page("zh", 2, "privacy", "privacy/", {
  title: "隐私政策 — aoglang", desc: "aoglang 隐私政策说明。", canonical: `${SITE}/zh/privacy/`,
}, `    <h1>隐私政策</h1><article class="prose"><p>我们可能使用匿名访问统计（如 Google Analytics），不收集可识别个人身份的信息除非您通过联系表单自愿提供。</p><p>联系表单数据由第三方 FormSubmit 处理，请参阅其隐私条款。</p><p>最后更新：2026-05-27</p></article>`));
write("en/privacy/index.html", page("en", 2, "privacy", "privacy/", {
  title: "Privacy — aoglang", desc: "aoglang privacy policy.", canonical: `${SITE}/en/privacy/`,
}, `    <h1>Privacy policy</h1><article class="prose"><p>We may use anonymous analytics. We do not collect personal data unless you submit the contact form.</p><p>Form data is processed by FormSubmit; see their policy.</p><p>Last updated: 2026-05-27</p></article>`));

write("zh/terms/index.html", page("zh", 2, "terms", "terms/", {
  title: "使用条款 — aoglang", desc: "aoglang 网站使用条款。", canonical: `${SITE}/zh/terms/`,
}, `    <h1>使用条款</h1><article class="prose"><p>访问本站即表示您同意合法使用内容，不得用于侵权、骚扰或传播违法信息。</p><p>本站内容按「现状」提供，不作明示或暗示保证。</p><p>最后更新：2026-05-27</p></article>`));
write("en/terms/index.html", page("en", 2, "terms", "terms/", {
  title: "Terms — aoglang", desc: "Terms of use for aoglang.", canonical: `${SITE}/en/terms/`,
}, `    <h1>Terms of use</h1><article class="prose"><p>By using this site you agree not to misuse content or violate applicable laws.</p><p>Content is provided as-is without warranties.</p><p>Last updated: 2026-05-27</p></article>`));

// RSS
const rssItem = (title, link, desc, date) => `  <item>
    <title>${title}</title>
    <link>${link}</link>
    <description>${desc}</description>
    <pubDate>${date}</pubDate>
  </item>`;

write("zh/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>aoglang 文章</title>
  <link>${SITE}/zh/</link>
  <description>最新文章</description>
  <language>zh-CN</language>
${rssItem("欢迎来到 aoglang", `${SITE}/zh/articles/welcome-aoglang.html`, "纯 HTML 双语内容站介绍", "Tue, 27 May 2026 00:00:00 GMT")}
${rssItem("静态网站搭建指南", `${SITE}/zh/articles/static-site-guide.html`, "SEO 与发布清单", "Mon, 26 May 2026 00:00:00 GMT")}
</channel>
</rss>`);

write("en/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>aoglang Articles</title>
  <link>${SITE}/en/</link>
  <description>Latest articles</description>
  <language>en</language>
${rssItem("Welcome to aoglang", `${SITE}/en/articles/welcome-aoglang.html`, "Bilingual static site intro", "Tue, 27 May 2026 00:00:00 GMT")}
${rssItem("Static site guide", `${SITE}/en/articles/static-site-guide.html`, "SEO checklist", "Mon, 26 May 2026 00:00:00 GMT")}
</channel>
</rss>`);

// Root index
write("index.html", `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>aoglang — 选择语言 / Choose language</title>
  <meta name="description" content="aoglang 内容分享站。选择中文或 English。">
  <link rel="canonical" href="${SITE}/">
  <link rel="alternate" hreflang="zh" href="${SITE}/zh/">
  <link rel="alternate" hreflang="en" href="${SITE}/en/">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="site.webmanifest">
  <link rel="stylesheet" href="assets/css/main.css">
</head>
<body>
  <div class="lang-landing">
    <div>
      <a class="logo" href="zh/">
        <img src="assets/img/logo.svg" width="40" height="40" alt="">
        <span>aoglang</span>
      </a>
      <h1 style="font-size:1.5rem;margin:0 0 0.5rem">选择语言 / Choose language</h1>
      <p style="color:var(--color-muted);margin-bottom:1.5rem">Articles · Gallery · Video</p>
      <a class="btn" href="zh/">中文</a>
      <a class="btn btn-outline" href="en/" style="margin-left:0.5rem">English</a>
    </div>
  </div>
</body>
</html>`);

// Sitemap
const urls = [
  "/", "/zh/", "/en/",
  "/zh/articles/", "/en/articles/",
  "/zh/articles/welcome-aoglang.html", "/en/articles/welcome-aoglang.html",
  "/zh/articles/static-site-guide.html", "/en/articles/static-site-guide.html",
  "/zh/gallery/", "/en/gallery/",
  "/zh/gallery/spring-scenes.html", "/en/gallery/spring-scenes.html",
  "/zh/gallery/infinity-3d.html", "/en/gallery/infinity-3d.html",
  "/zh/videos/", "/en/videos/",
  "/zh/videos/intro-aoglang.html", "/en/videos/intro-aoglang.html",
  "/zh/contact/", "/en/contact/",
  "/zh/about/", "/en/about/",
  "/zh/privacy/", "/en/privacy/",
  "/zh/terms/", "/en/terms/",
];

const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => {
  const loc = u === "/" ? SITE + "/" : SITE + u;
  const zh = u === "/" ? `${SITE}/zh/` : u.startsWith("/en") ? loc.replace("/en", "/zh") : loc.includes("/zh") ? loc : null;
  const en = u === "/" ? `${SITE}/en/` : u.startsWith("/zh") ? loc.replace("/zh", "/en") : null;
  let alt = "";
  if (zh && en && u !== "/") {
    alt = `\n    <xhtml:link rel="alternate" hreflang="zh" href="${zh}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`;
  } else if (u === "/") {
    alt = `\n    <xhtml:link rel="alternate" hreflang="zh" href="${SITE}/zh/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/"/>`;
  }
  return `  <url>
    <loc>${loc}</loc>${alt}
    <changefreq>weekly</changefreq>
  </url>`;
}).join("\n")}
</urlset>`;
write("sitemap.xml", sm);

/** 根目录短路径 → 按浏览器语言跳到 zh/ 或 en/ 对应栏目 */
function rootSectionRedirectHtml(section, opts = {}) {
  const { hash = "", labelZh = "正在跳转…", labelEn = "Redirecting…" } = opts;
  const path = section ? `${section}/` : "";
  const hashPart = hash ? hash.replace(/^#/, "") : "";
  const targetSuffix = hashPart ? `#${hashPart}` : "";
  const title = section ? `${section} — aoglang` : "aoglang";
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta http-equiv="refresh" content="0;url=../zh/${path}${targetSuffix}">
  <link rel="canonical" href="${SITE}/zh/${path}">
  <script>
(function () {
  var lang = /^zh/i.test(navigator.language || "") ? "zh" : "en";
  var q = location.search || "";
  location.replace("../" + lang + "/${path}" + q + "${targetSuffix}");
})();
  </script>
</head>
<body>
  <p>${labelZh} <a href="../zh/${path}${targetSuffix}">中文</a> · <a href="../en/${path}${targetSuffix}">English</a></p>
</body>
</html>`;
}

const rootRedirects = [
  "articles",
  "gallery",
  "videos",
  "contact",
  "about",
  "privacy",
  "terms",
];
for (const section of rootRedirects) {
  write(`${section}/index.html`, rootSectionRedirectHtml(section));
}
write(
  "search/index.html",
  rootSectionRedirectHtml("", { hash: "#search", labelZh: "前往首页搜索", labelEn: "Go to home search" })
);

console.log("Done.");
