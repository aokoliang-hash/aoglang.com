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

function relToAssets(depth) {
  return "../".repeat(depth) + "assets";
}

function relToRoot(depth) {
  return "../".repeat(depth);
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
      return `<li><a href="${base}${href}"${cur}>${label}</a></li>`;
    })
    .join("\n          ");

  const drawerItems = nav
    .map(([label, href]) => `<li><a href="${base}${href}">${label}</a></li>`)
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
  let base = depth === 1 ? "" : depth === 2 ? "../" : "../../";
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
  const base = depth === 1 ? "" : depth === 2 ? "../" : "../../";
  const rootBase = relToRoot(depth);
  const nav = lang === "zh" ? navZh : navEn;
  const skip = lang === "zh" ? "跳到主要内容" : "Skip to main content";
  const menuLabel = lang === "zh" ? "打开菜单" : "Open menu";
  const zhHref = rootBase + "zh/" + (mirrorPath || "");
  const enHref = rootBase + "en/" + (mirrorPath || "");

  const navItems = nav
    .map(([label, href, key]) => {
      const cur = key === active ? ' aria-current="page"' : "";
      return `<li><a href="${base}${href}"${cur}>${label}</a></li>`;
    })
    .join("\n          ");

  const drawerItems = nav
    .map(([label, href]) => `<li><a href="${base}${href}">${label}</a></li>`)
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
      <article class="card"${cardThumbAttr(640, 360)}>
        <img class="card-thumb" src="../assets/img/placeholder.svg" width="640" height="360" alt="欢迎来到 aoglang 文章封面" loading="lazy">
        <div class="card-body"><h3><a href="articles/welcome-aoglang.html">欢迎来到 aoglang</a></h3><p class="card-meta"><span class="tag">文章</span>2026-05-27</p></div>
      </article>
      <article class="card"${cardThumbAttr(800, 600)}>
        <img class="card-thumb" src="../assets/img/gallery/spring-1.svg" width="800" height="600" alt="春日图集封面" loading="lazy">
        <div class="card-body"><h3><a href="gallery/spring-scenes.html">春日图集</a></h3><p class="card-meta"><span class="tag">图集</span>6 张</p></div>
      </article>
      <article class="card"${cardThumbAttr(1280, 720)}>
        <img class="card-thumb" src="../assets/img/video-poster.svg" width="1280" height="720" alt="认识 aoglang 视频封面" loading="lazy">
        <div class="card-body"><h3><a href="videos/intro-aoglang.html">认识 aoglang</a></h3><p class="card-meta"><span class="tag">视频</span>HTML5</p></div>
      </article>
      <article class="card"${cardThumbAttr(640, 360)}>
        <img class="card-thumb" src="../assets/img/placeholder.svg" width="640" height="360" alt="静态网站搭建指南" loading="lazy">
        <div class="card-body"><h3><a href="articles/static-site-guide.html">静态网站搭建指南</a></h3><p class="card-meta"><span class="tag">文章</span>2026-05-26</p></div>
      </article>
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
      <article class="card"${cardThumbAttr(640, 360)}>
        <img class="card-thumb" src="../assets/img/placeholder.svg" width="640" height="360" alt="Welcome to aoglang article cover" loading="lazy">
        <div class="card-body"><h3><a href="articles/welcome-aoglang.html">Welcome to aoglang</a></h3><p class="card-meta"><span class="tag">Article</span>2026-05-27</p></div>
      </article>
      <article class="card"${cardThumbAttr(800, 600)}>
        <img class="card-thumb" src="../assets/img/gallery/spring-1.svg" width="800" height="600" alt="Spring scenes gallery cover" loading="lazy">
        <div class="card-body"><h3><a href="gallery/spring-scenes.html">Spring scenes</a></h3><p class="card-meta"><span class="tag">Gallery</span>6 photos</p></div>
      </article>
      <article class="card"${cardThumbAttr(1280, 720)}>
        <img class="card-thumb" src="../assets/img/video-poster.svg" width="1280" height="720" alt="Intro to aoglang video cover" loading="lazy">
        <div class="card-body"><h3><a href="videos/intro-aoglang.html">Intro to aoglang</a></h3><p class="card-meta"><span class="tag">Video</span>HTML5</p></div>
      </article>
      <article class="card"${cardThumbAttr(640, 360)}>
        <img class="card-thumb" src="../assets/img/placeholder.svg" width="640" height="360" alt="Static site guide" loading="lazy">
        <div class="card-body"><h3><a href="articles/static-site-guide.html">Static site guide</a></h3><p class="card-meta"><span class="tag">Article</span>2026-05-26</p></div>
      </article>
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
    <header class="article-header"><h1>欢迎来到 aoglang</h1><p class="card-meta">2026-05-27 · <a href="../../en/articles/welcome-aoglang.html" hreflang="en">English</a></p></header>
    <article class="prose">
      <p>本站是<strong>纯 HTML 静态站</strong>：无数据库、无 PHP，适合个人或小团队内容分享。每种语言使用独立页面，利于 SEO。</p>
      <h2>你能在这里找到什么</h2>
      <ul><li><strong>文章</strong>：教程、随笔、长文</li><li><strong>图集</strong>：多图展示，配中英文说明</li><li><strong>视频</strong>：HTML5 自托管或嵌入 B站 / YouTube</li></ul>
      <h2>下一步</h2>
      <p>阅读<a href="static-site-guide.html">静态网站搭建指南</a>，或浏览<a href="../gallery/spring-scenes.html">春日图集</a>示例。</p>
    </article>`;
const welcomeEn = `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Articles</a></li><li aria-current="page">Welcome to aoglang</li></ol>
    <header class="article-header"><h1>Welcome to aoglang</h1><p class="card-meta">2026-05-27 · <a href="../../zh/articles/welcome-aoglang.html" hreflang="zh">中文版</a></p></header>
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
    <header class="article-header"><h1>静态网站搭建指南</h1><p class="card-meta">2026-05-26 · <a href="../../en/articles/static-site-guide.html" hreflang="en">English</a></p></header>
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
    <header class="article-header"><h1>Static site guide</h1><p class="card-meta">2026-05-26 · <a href="../../zh/articles/static-site-guide.html" hreflang="zh">中文版</a></p></header>
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

// Gallery
const galleryGrid = (depth) => {
  const p = depth === 2 ? "../../" : "../../../";
  return [1, 2, 3, 4, 5, 6]
    .map(
      (n) => `<figure><img src="${p}assets/img/gallery/spring-${n}.svg" width="800" height="600" alt="${n}" loading="lazy"><figcaption>Photo ${n}</figcaption></figure>`
    )
    .join("\n      ");
};

for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  write(`${lang}/gallery/index.html`, page(lang, 2, "gallery", "gallery/", {
    title: isZh ? "图集 — aoglang" : "Gallery — aoglang",
    desc: isZh ? "图片与摄影图集。" : "Photo galleries on aoglang.",
    canonical: `${SITE}/${lang}/gallery/`,
  }, isZh
    ? `    <h1>图集</h1><div class="masonry-grid"><article class="card"><img class="card-thumb" src="../../assets/img/gallery/spring-1.svg" alt="春日图集" loading="lazy"><div class="card-body"><h2><a href="spring-scenes.html">春日图集</a></h2><p class="card-meta">6 张 · 2026-05</p></div></article></div>`
    : `    <h1>Gallery</h1><div class="masonry-grid"><article class="card"><img class="card-thumb" src="../../assets/img/gallery/spring-1.svg" alt="Spring scenes" loading="lazy"><div class="card-body"><h2><a href="spring-scenes.html">Spring scenes</a></h2><p class="card-meta">6 photos · 2026-05</p></div></article></div>`));

  const cap = (n) => (isZh ? `春日景象 ${n}` : `Spring scene ${n}`);
  const figs = [1, 2, 3, 4, 5, 6]
    .map(
      (n) =>
        `<figure><img src="../../../assets/img/gallery/spring-${n}.svg" width="800" height="600" alt="${cap(n)}" loading="lazy"><figcaption>${cap(n)}</figcaption></figure>`
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
    <header class="article-header"><h1>春日图集</h1><p class="card-meta"><a href="../../en/gallery/spring-scenes.html" hreflang="en">English</a></p></header>
    <div class="gallery-grid prose-wide">${figs}</div>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Gallery</a></li><li aria-current="page">Spring scenes</li></ol>
    <header class="article-header"><h1>Spring scenes</h1><p class="card-meta"><a href="../../zh/gallery/spring-scenes.html" hreflang="zh">中文版</a></p></header>
    <div class="gallery-grid prose-wide">${figs}</div>`
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
    <header class="article-header"><h1>认识 aoglang</h1><p class="card-meta"><a href="../../en/videos/intro-aoglang.html" hreflang="en">English</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="../../../assets/img/video-poster.svg">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        您的浏览器不支持视频播放。
      </video>
      <p>以上为示例视频（MDN 公共领域）。替换 <code>source</code> 为你的 mp4/webm 文件路径即可自托管。</p>
      <h2>嵌入 B站 / YouTube</h2>
      <div class="video-wrap"><iframe title="嵌入视频示例" src="https://www.youtube-nocookie.com/embed/EngW7bV5ING" loading="lazy" allowfullscreen></iframe></div>
    </article>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Videos</a></li><li aria-current="page">Intro</li></ol>
    <header class="article-header"><h1>Intro to aoglang</h1><p class="card-meta"><a href="../../zh/videos/intro-aoglang.html" hreflang="zh">中文版</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="../../../assets/img/video-poster.svg">
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

console.log("Done.");
