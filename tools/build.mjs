import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import sharp from "sharp";

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

/** 切换到另一语言的 mirror 页面（depth 1: ../en/；depth 2/3: ../../en/…） */
function crossLangHref(toLang, mirrorPath, depth = 2) {
  const prefix = depth <= 1 ? "../" : "../../";
  return `${prefix}${toLang}/${mirrorPath || ""}`;
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
  const zhHref = crossLangHref("zh", mirrorPath, depth);
  const enHref = crossLangHref("en", mirrorPath, depth);

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
  return `<article class="card"${thumbStyle}><a class="card-anchor" href="${href}"><img class="card-thumb" src="${imgSrc}" width="${imgW}" height="${imgH}" alt="${imgAlt}" loading="lazy" decoding="async"><div class="card-body"><${tag}>${heading}</${tag}><p class="card-meta">${meta}</p></div></a></article>`;
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

// Videos — upload/video → assets/media/video
const VIDEOS = [
  {
    slug: "warm-visual-clip",
    file: "video-01.mp4",
    uploadFile: "video1.mp4",
    poster: "video-01-poster.jpg",
    w: 960,
    h: 540,
    durationIso: "PT14S",
    durationZh: "约 14 秒",
    durationEn: "~14 sec",
    date: "2026-05-27",
    zh: {
      title: "暖色视觉短片",
      desc: "960×540 自托管 MP4 短片，暖色调画面与柔和节奏，适合作为 aoglang 视频栏目示例与视觉灵感。",
      tags: ["视频", "短片", "暖色", "视觉", "自托管", "MP4", "aoglang"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 aoglang 自托管的<strong>暖色视觉短片</strong>（约 14 秒，960×540）。画面强调色温与氛围，可作为品牌 mood board、社媒预告或页面背景动效的参考素材。",
        },
        {
          h: "观看与分享",
          p: "使用下方 HTML5 播放器即可在电脑与手机上观看，无需插件。若需引用，请注明来源 <strong>aoglang</strong> 并链接本页，便于读者找到高清源文件。",
        },
        {
          h: "技术说明",
          p: "格式为 H.264 MP4，托管于本站 <code>assets/media/video/</code>，利于 SEO 与加载速度控制。更多图集与文章见导航栏。",
        },
      ],
    },
    en: {
      title: "Warm-tone visual clip",
      desc: "Self-hosted 960×540 MP4 short clip with warm palette and calm pacing—featured on aoglang’s video section.",
      tags: ["video", "short clip", "warm tone", "visual", "self-hosted", "MP4", "aoglang"],
      sections: [
        {
          h: "About this clip",
          p: "A <strong>warm-tone visual short</strong> (~14 seconds, 960×540) hosted on aoglang. Use it as mood reference, social teaser, or background motion for landing pages.",
        },
        {
          h: "Watch & share",
          p: "Play inline below on desktop and mobile—no plugins required. When republishing, credit <strong>aoglang</strong> and link to this page for the canonical source.",
        },
        {
          h: "Technical notes",
          p: "H.264 MP4 served from <code>assets/media/video/</code> for fast static hosting and clear SEO. Browse galleries and articles from the main nav.",
        },
      ],
    },
  },
  {
    slug: "hd-motion-visual",
    file: "video-02.mp4",
    uploadFile: "video2.mp4",
    poster: "video-02-poster.jpg",
    w: 1280,
    h: 720,
    durationIso: "PT12S",
    durationZh: "约 12 秒",
    durationEn: "~12 sec",
    date: "2026-05-27",
    zh: {
      title: "高清动感视觉短片",
      desc: "1280×720 高清 MP4 短片，16:9 画幅与流畅动感，适合产品展示、创意片头与视频栏目推荐位。",
      tags: ["视频", "高清", "720p", "16:9", "动感", "自托管", "aoglang"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 <strong>1280×720 高清动感短片</strong>（约 12 秒，16:9）。适合用作产品氛围片、创意开场或视频列表封面预览，突出清晰细节与动态节奏。",
        },
        {
          h: "适用场景",
          p: "可用于官网首屏视频、作品集展示、培训材料插图，或配合本站<a href=\"../gallery/infinity-3d.html\">无穷符号 3D 图集</a>形成统一的视觉叙事。",
        },
        {
          h: "SEO 与可访问性",
          p: "本页提供结构化数据（VideoObject）、双语标题与描述，并配有封面图 <code>poster</code>，方便搜索引擎摘要展示与无障碍访问。",
        },
      ],
    },
    en: {
      title: "HD motion visual clip",
      desc: "1280×720 MP4 short in 16:9 with crisp motion—ideal for product vibes, openers, and featured video slots on aoglang.",
      tags: ["video", "HD", "720p", "16:9", "motion", "self-hosted", "aoglang"],
      sections: [
        {
          h: "Overview",
          p: "A <strong>1280×720 HD motion clip</strong> (~12 seconds, 16:9) with clear detail and dynamic pacing—great for hero videos, reels, and portfolio previews.",
        },
        {
          h: "Where to use it",
          p: "Pair with our <a href=\"../gallery/infinity-3d.html\">Infinity 3D gallery</a> for a consistent visual story on landing pages, decks, or social posts.",
        },
        {
          h: "SEO & accessibility",
          p: "This page ships VideoObject schema, bilingual copy, and a <code>poster</code> image so search snippets and assistive tech get meaningful context.",
        },
      ],
    },
  },
  {
    slug: "tech-visual-short",
    file: "video-03.mp4",
    uploadFile: "3a9f2598-f35b-11ef-8152-8e82dfcce76c_0.mp4",
    poster: "video-03-poster.jpg",
    w: 1440,
    h: 960,
    durationIso: "PT6S",
    durationZh: "约 6 秒",
    durationEn: "~6 sec",
    date: "2026-05-27",
    zh: {
      title: "科技视觉短片",
      desc: "1440×960 自托管 MP4，动感科技视觉节奏，适合栏目推荐与社媒短视频位。",
      tags: ["视频", "科技", "视觉", "短片", "自托管", "aoglang"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 aoglang 新增的<strong>科技视觉短片</strong>（约 6 秒，1440×960），画面节奏紧凑，适合作为科技、创意类内容的头图视频或背景循环。",
        },
        {
          h: "观看说明",
          p: "支持桌面与移动端 HTML5 播放。引用时请链接本页，便于访问者找到原始文件。",
        },
        {
          h: "技术信息",
          p: "文件位于 <code>assets/media/video/video-03.mp4</code>，构建时从 <code>upload/video/</code> 同步。",
        },
      ],
    },
    en: {
      title: "Tech visual short clip",
      desc: "Self-hosted 1440×960 MP4 with a tech-forward motion beat—ideal for featured video slots.",
      tags: ["video", "tech", "visual", "short", "self-hosted", "aoglang"],
      sections: [
        {
          h: "Overview",
          p: "A <strong>tech visual short</strong> (~6 seconds, 1440×960) synced from the upload folder—tight pacing for hero loops and reels.",
        },
        {
          h: "How to watch",
          p: "Plays inline with HTML5 controls. Link to this page when embedding on other sites.",
        },
        {
          h: "Technical notes",
          p: "Served from <code>assets/media/video/video-03.mp4</code>, copied during <code>npm run build</code>.",
        },
      ],
    },
  },
];

/** 文章数据：构建时生成 zh/en 页面、列表、首页与搜索索引 */
const ARTICLES = [
  {
    slug: "drone-aerial-city-photography",
    date: "2026-06-01",
    rssDate: "Sun, 01 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/tokyo-waterside-highway-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "东京滨水高速航拍",
      altEn: "Tokyo waterside highway aerial",
    },
    zh: {
      title: "无人机城市航拍指南：东京、福州与海上风电",
      desc: "从东京滨水高速到福州体育场与海上风电，如何为航拍图集写清主题、alt 与内链，提升图片类关键词排名。",
      tags: ["文章", "航拍", "无人机", "城市", "SEO", "图集"],
      intro:
        "航拍类视觉在 aoglang 图集中占重要位置。本文梳理<strong>城市与能源题材航拍</strong>如何写成可被搜索理解的文章，并链到本站对应单图页面。",
      sections: [
        {
          h: "选题与关键词：从地标到行业场景",
          p: "单张图片的 SEO 不只靠文件名。为作品写清<strong>地点 + 视角 + 时段</strong>（如「东京滨水高速黄昏航拍」），并在正文中自然出现「无人机」「高速公路」「城市天际线」等检索词。可对照本站 <a href=\"../gallery/tokyo-waterside-highway.html\">东京滨水高速</a>、<a href=\"../gallery/fuzhou-stadium-aerial-01.html\">福州体育场航拍</a> 等页面的标题结构。",
        },
        {
          h: "成组发布：同主题多张图如何互链",
          p: "同一城市的不同机位（如 <a href=\"../gallery/tokyo-highway-bridge-01.html\">高速桥面 01</a> 与 <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a>）适合在文章里组成「系列」，引导读者浏览合辑，也帮助搜索引擎理解内容簇。能源题材可链到 <a href=\"../gallery/wind-turbines-drone-01.html\">海上风电航拍</a>。",
        },
        {
          h: "配图与性能",
          p: "列表页应使用 WebP 缩略图，详情页提供宽度适中的主图，避免一次加载数 MB 的 PNG。本站构建脚本会在 <code>npm run build</code> 时自动生成主图与 <code>-thumb.webp</code>，详见 <a href=\"webp-gallery-performance.html\">图集 WebP 优化指南</a>。",
        },
      ],
    },
    en: {
      title: "Drone city aerials: Tokyo, Fuzhou & offshore wind",
      desc: "How to turn aerial gallery shots into SEO-friendly articles with clear topics, alt text, and internal links.",
      tags: ["article", "aerial", "drone", "urban", "SEO", "gallery"],
      intro:
        "Aerial visuals are a core part of the aoglang gallery. This guide explains how to write <strong>discoverable copy</strong> around city and energy themes and link to individual photo pages.",
      sections: [
        {
          h: "Topics and keywords: from landmarks to industries",
          p: "Image SEO needs more than filenames. State <strong>place + angle + time</strong> (e.g. dusk drone view of Tokyo’s waterfront expressway) and use phrases people search for. Compare with pages like <a href=\"../gallery/tokyo-waterside-highway.html\">Tokyo waterside highway</a> and <a href=\"../gallery/fuzhou-stadium-aerial-01.html\">Fuzhou stadium aerial</a>.",
        },
        {
          h: "Publishing in sets with internal links",
          p: "Multiple angles of one city (e.g. <a href=\"../gallery/tokyo-highway-bridge-01.html\">highway bridge 01</a> and <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a>) work well as a series in an article. Energy shots can link to <a href=\"../gallery/wind-turbines-drone-01.html\">offshore wind turbines</a>.",
        },
        {
          h: "Images and performance",
          p: "Use WebP thumbs on indexes and moderately sized heroes on detail pages. Our build generates <code>-thumb.webp</code> variants—see <a href=\"webp-gallery-performance.html\">WebP gallery performance</a>.",
        },
      ],
    },
  },
  {
    slug: "webp-gallery-performance",
    date: "2026-05-31",
    rssDate: "Sat, 31 May 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/wind-turbines-drone-01-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "海上风电无人机航拍",
      altEn: "Offshore wind turbines aerial",
    },
    zh: {
      title: "图集网站如何用 WebP 与缩略图提升加载速度",
      desc: "构建时生成 1400px 主图与 480px 缩略图，列表与首页用 thumb、详情用主图，显著降低首屏流量。",
      tags: ["文章", "WebP", "性能", "图集", "SEO", "静态站"],
      intro:
        "图集页往往因大图导致首屏缓慢。aoglang 在构建阶段用 <strong>sharp</strong> 将 upload 原图转为 WebP，并区分列表缩略图与详情主图。",
      sections: [
        {
          h: "为什么要两套尺寸",
          p: "瀑布流列表可能同时展示数十张卡片，若每张都加载 4K PNG，移动网络下体验很差。本站规则：<strong>卡片用 *-thumb.webp（宽≤480px）</strong>，<strong>单图页用 *.webp（宽≤1400px）</strong>，原图仅保留在本地 upload 目录。",
        },
        {
          h: "与 SEO 的关系",
          p: "更快的 LCP 有利于体验信号；同时每张图仍有独立 URL、<code>title</code>、<code>meta description</code> 与 ImageObject 结构化数据。浏览 <a href=\"../gallery/\">图集索引</a> 时，搜索引擎与用户都能从缩略图进入完整说明页。",
        },
        {
          h: "发布新图流程",
          p: "将 PNG/JPG 放入 <code>upload/picture/</code>，运行 <code>npm run build</code>，脚本会复制并优化到 <code>assets/img/gallery/</code>，并再生双语 HTML。更多站点结构见 <a href=\"static-site-guide.html\">静态网站搭建指南</a>。",
        },
      ],
    },
    en: {
      title: "WebP thumbnails for faster gallery pages",
      desc: "Build-time 1400px heroes and 480px thumbs—indexes stay light while detail pages stay sharp.",
      tags: ["article", "WebP", "performance", "gallery", "SEO", "static"],
      intro:
        "Galleries often feel slow because indexes load huge PNGs. aoglang converts uploads to <strong>WebP at build time</strong> with separate thumb and hero sizes.",
      sections: [
        {
          h: "Why two sizes",
          p: "Masonry grids may show dozens of cards at once. We serve <strong>*-thumb.webp (≤480px wide)</strong> on lists and <strong>*.webp (≤1400px)</strong> on detail pages; originals stay in <code>upload/picture/</code> only.",
        },
        {
          h: "SEO impact",
          p: "Better LCP helps user experience; each image still has its own URL, meta description, and ImageObject schema. Browse the <a href=\"../gallery/\">gallery index</a> to see thumbs linking to full write-ups.",
        },
        {
          h: "Adding new photos",
          p: "Drop files into <code>upload/picture/</code>, run <code>npm run build</code>, and HTML plus optimized assets regenerate. See the <a href=\"static-site-guide.html\">static site guide</a> for the full checklist.",
        },
      ],
    },
  },
  {
    slug: "infinity-3d-brand-visuals",
    date: "2026-05-30",
    rssDate: "Fri, 30 May 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/wqd/wqd-01-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "铜色金属无穷环 3D 视觉",
      altEn: "Copper metallic infinity 3D visual",
    },
    zh: {
      title: "无穷符号 3D 视觉：品牌抽象与合辑页 SEO",
      desc: "十张无穷符号主题 3D 作品如何既保留合辑页又拆分单图 URL，兼顾品牌叙事与长尾关键词。",
      tags: ["文章", "3D", "无穷符号", "品牌", "图集", "SEO"],
      intro:
        "抽象 3D 视觉常用于科技品牌、发布会与素材库。本站 <a href=\"../gallery/infinity-3d.html\">无穷符号 3D 合辑</a> 下每张作品另有独立页面，便于分享与收录。",
      sections: [
        {
          h: "合辑页 + 单图页的双层结构",
          p: "合辑页适合讲述系列概念（材质、光感、配色），单图页（如 <a href=\"../gallery/wqd-05.html\">双色光影无穷环</a>）则针对具体造型写标题与关键词。文章栏目可解读创作方向，图集承担视觉交付。",
        },
        {
          h: "标题与描述怎么写",
          p: "避免十张图共用同一句文案。为每张写<strong>材质 + 形态 + 情绪</strong>（例如「虹彩玻璃方块无穷环」），并在 <code>meta description</code> 里出现「3D」「无穷符号」「抽象」等检索词。",
        },
        {
          h: "与视频、文章组合",
          p: "3D 视觉可与 <a href=\"../videos/hd-motion-visual.html\">高清动感短片</a> 搭配用于落地页。也可阅读 <a href=\"tech-lifestyle-visual-storytelling.html\">科技与生活类视觉策划</a> 了解多栏目联动。",
        },
      ],
    },
    en: {
      title: "Infinity 3D visuals: brand abstracts & collection SEO",
      desc: "Ten infinity-themed 3D renders with both a collection URL and per-image pages for sharing and long-tail search.",
      tags: ["article", "3D", "infinity", "branding", "gallery", "SEO"],
      intro:
        "Abstract 3D art supports tech branding and event decks. Our <a href=\"../gallery/infinity-3d.html\">Infinity 3D collection</a> links to individual URLs such as <a href=\"../gallery/wqd-10.html\">iridescent glass blocks</a>.",
      sections: [
        {
          h: "Collection page plus detail URLs",
          p: "The collection explains the series; each piece (e.g. <a href=\"../gallery/wqd-05.html\">dual-lit chrome infinity</a>) gets its own title and keywords. Articles interpret the creative direction; galleries host the assets.",
        },
        {
          h: "Writing titles and descriptions",
          p: "Do not reuse one caption for every render. Describe <strong>material + form + mood</strong> per image and include terms like “3D”, “infinity”, and “abstract” in meta descriptions.",
        },
        {
          h: "Mix with video and articles",
          p: "Pair stills with motion such as the <a href=\"../videos/hd-motion-visual.html\">HD motion clip</a>. See <a href=\"tech-lifestyle-visual-storytelling.html\">tech & lifestyle visual planning</a> for cross-section ideas.",
        },
      ],
    },
  },
  {
    slug: "self-hosted-video-seo",
    date: "2026-05-29",
    rssDate: "Thu, 29 May 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/video/video-03-poster.jpg",
      w: 1440,
      h: 960,
      altZh: "科技视觉短片封面",
      altEn: "Tech visual short poster",
    },
    zh: {
      title: "自托管 MP4 视频页：体验与搜索引擎优化实践",
      desc: "HTML5 自托管视频如何设置 poster、双语文案、VideoObject 与栏目内链，让短片页面也可被检索。",
      tags: ["文章", "视频", "SEO", "MP4", "自托管", "结构化数据"],
      intro:
        "视频不必全部依赖外链平台。本站 <a href=\"../videos/\">视频栏目</a> 提供自托管 MP4 示例，每支短片均有独立说明页。",
      sections: [
        {
          h: "页面必备元素",
          p: "每支视频应有：<strong>唯一 URL</strong>、清晰的 <code>h1</code> 与 <code>meta description</code>、封面图 <code>poster</code>、时长说明，以及 VideoObject JSON-LD。参考 <a href=\"../videos/tech-visual-short.html\">科技视觉短片</a> 与 <a href=\"../videos/warm-visual-clip.html\">暖色视觉短片</a>。",
        },
        {
          h: "体积与加载",
          p: "短视频适合控制在十余秒内，并压缩码率；首屏仍可用 poster 图片避免空白。若文件过大，可外链 CDN 并在文章中说明源地址。",
        },
        {
          h: "与图集、文章联动",
          p: "在视频页底部链到相关 <a href=\"../gallery/ai-high-tech-lights.html\">科技光效图集</a> 或本专栏文章，形成主题集群，有利于用户停留与站内权重传递。",
        },
      ],
    },
    en: {
      title: "Self-hosted MP4 pages: UX and video SEO",
      desc: "Posters, bilingual copy, VideoObject schema, and internal links for short clips hosted on a static site.",
      tags: ["article", "video", "SEO", "MP4", "self-hosted", "schema"],
      intro:
        "You do not have to embed every clip from a third-party platform. The <a href=\"../videos/\">video section</a> hosts MP4 examples with dedicated pages.",
      sections: [
        {
          h: "What each page needs",
          p: "Provide a <strong>unique URL</strong>, clear <code>h1</code> and <code>meta description</code>, a <code>poster</code> image, duration text, and VideoObject JSON-LD—see <a href=\"../videos/tech-visual-short.html\">tech visual short</a> and <a href=\"../videos/warm-visual-clip.html\">warm visual clip</a>.",
        },
        {
          h: "File size",
          p: "Keep shorts under ~15 seconds with sensible compression; posters prevent layout shift. Host very large files on a CDN and link from the article.",
        },
        {
          h: "Link galleries and articles",
          p: "Cross-link related stills such as <a href=\"../gallery/ai-high-tech-lights.html\">AI high-tech lights</a> to build topical clusters.",
        },
      ],
    },
  },
  {
    slug: "tech-lifestyle-visual-storytelling",
    date: "2026-05-28",
    rssDate: "Wed, 28 May 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/laptop-news-desk-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "笔记本与新闻资讯桌面",
      altEn: "Laptop and news desk",
    },
    zh: {
      title: "科技与生活类视觉：如何组织成可搜索的专题",
      desc: "从办公场景、能源光效到户外休憩，用文章串联图集与视频，覆盖科技、生活方式与工业等长尾词。",
      tags: ["文章", "科技", "生活方式", "视觉", "内容策划", "SEO"],
      intro:
        "除航拍外，本站图集还包含<strong>科技、办公、能源与人物</strong>等题材。通过文章解释「为什么拍、适合什么场景」，比单张图片更易获得文字搜索流量。",
      sections: [
        {
          h: "按使用场景分组",
          p: "办公与资讯类可链 <a href=\"../gallery/laptop-news-desk.html\">笔记本新闻桌面</a>、<a href=\"../gallery/computer-technician-office.html\">技术员办公</a>；能源科技可链 <a href=\"../gallery/electric-grid-energy-lines.html\">电网能量流光</a>、<a href=\"../gallery/wafer-chip-inspection-01.html\">晶圆检测特写</a>。",
        },
        {
          h: "生活方式与情感画面",
          p: "人物与细节特写（如 <a href=\"../gallery/senior-outdoor-relax.html\">户外休憩</a>、<a href=\"../gallery/hand-pink-nails-closeup.html\">美甲手部特写</a>）适合健康、美容、养老等行业内容配图，文章应用一句话点明受众。",
        },
        {
          h: "发布节奏建议",
          p: "新图入库后：先 <code>npm run build</code> 生成页面，再写一篇解读文章并加入首页「最新内容」，最后更新 RSS 与 sitemap——构建脚本会自动处理搜索索引。",
        },
      ],
    },
    en: {
      title: "Tech & lifestyle visuals as searchable topics",
      desc: "Connect office, energy, and leisure shots with articles that capture long-tail queries beyond image filenames.",
      tags: ["article", "tech", "lifestyle", "visual", "content", "SEO"],
      intro:
        "Beyond aerials, the gallery covers <strong>tech, work, energy, and people</strong>. Articles explain intent and use cases—often easier to rank than image-only URLs.",
      sections: [
        {
          h: "Group by use case",
          p: "Office themes: <a href=\"../gallery/laptop-news-desk.html\">laptop news desk</a>, <a href=\"../gallery/computer-technician-office.html\">technician at work</a>. Energy/tech: <a href=\"../gallery/electric-grid-energy-lines.html\">electric grid lines</a>, <a href=\"../gallery/wafer-chip-inspection-01.html\">wafer inspection</a>.",
        },
        {
          h: "Lifestyle and emotion",
          p: "Human moments such as <a href=\"../gallery/senior-outdoor-relax.html\">senior relaxing outdoors</a> suit wellness and leisure niches—state the audience in one sentence.",
        },
        {
          h: "Publishing workflow",
          p: "After adding uploads, run <code>npm run build</code>, publish an article, feature it on the home page, and let the script refresh search JSON and sitemap.",
        },
      ],
    },
  },
  {
    slug: "welcome-aoglang",
    date: "2026-05-27",
    rssDate: "Tue, 27 May 2026 00:00:00 GMT",
    thumb: null,
    zh: {
      title: "欢迎来到 aoglang",
      desc: "了解 aoglang 纯 HTML 双语内容站：文章、图集与视频栏目及 SEO 设计。",
      tags: ["文章", "指南", "静态站", "双语"],
      intro: "本站是<strong>纯 HTML 静态站</strong>：无数据库、无 PHP，适合个人或小团队内容分享。每种语言使用独立页面，利于 SEO。",
      sections: [
        {
          h: "你能在这里找到什么",
          p: "栏目包括：<strong><a href=\"./\">文章</a></strong>（教程与策划）、<strong><a href=\"../gallery/\">图集</a></strong>（航拍、3D 与生活方式视觉）、<strong><a href=\"../videos/\">视频</a></strong>（自托管 MP4 短片）。",
        },
        {
          h: "下一步",
          p: "阅读 <a href=\"static-site-guide.html\">静态网站搭建指南</a>，或从 <a href=\"drone-aerial-city-photography.html\">航拍 SEO 指南</a>、<a href=\"../gallery/tokyo-waterside-highway.html\">东京滨水高速</a> 进入浏览。",
        },
      ],
    },
    en: {
      title: "Welcome to aoglang",
      desc: "About the aoglang bilingual static site—articles, galleries, videos, and SEO.",
      tags: ["article", "guide", "static", "bilingual"],
      intro: "This is a <strong>pure HTML static site</strong>—no database, no PHP. Each language has its own URLs for better SEO.",
      sections: [
        {
          h: "What you'll find",
          p: "Sections include <strong><a href=\"./\">articles</a></strong>, the <strong><a href=\"../gallery/\">gallery</a></strong>, and <strong><a href=\"../videos/\">videos</a></strong> with self-hosted clips.",
        },
        {
          h: "Next steps",
          p: "Read the <a href=\"static-site-guide.html\">static site guide</a> or start with <a href=\"drone-aerial-city-photography.html\">drone aerial SEO tips</a>.",
        },
      ],
    },
  },
  {
    slug: "static-site-guide",
    date: "2026-05-26",
    rssDate: "Mon, 26 May 2026 00:00:00 GMT",
    thumb: null,
    zh: {
      title: "静态网站搭建指南",
      desc: "纯 HTML 站点目录、SEO、RSS、sitemap 与搜索索引的发布清单。",
      tags: ["文章", "SEO", "静态站", "sitemap"],
      intro: "使用生成脚本维护双语页面，可避免手工漏改链接或站点地图。",
      sections: [
        {
          h: "目录结构",
          p: "<pre><code>zh/  en/  assets/  tools/build.mjs  sitemap.xml</code></pre> 新文章在 <code>tools/build.mjs</code> 的 <code>ARTICLES</code> 数组中登记后运行 <code>npm run build</code>。",
        },
        {
          h: "每篇新文章 checklist",
          p: "填写 slug、日期、双语 title/description、正文 sections；构建会自动写入列表页、首页最新内容（若加入 <code>HOME_LATEST</code>）、RSS、搜索索引与 sitemap。",
        },
        {
          h: "图片与性能",
          p: "图集使用 WebP 主图与缩略图，详见 <a href=\"webp-gallery-performance.html\">WebP 优化指南</a>。视频大文件可外链 CDN。",
        },
      ],
    },
    en: {
      title: "Static site guide",
      desc: "Folder layout, SEO, RSS, sitemap, and search index checklist for aoglang.",
      tags: ["article", "SEO", "static", "sitemap"],
      intro: "A build script keeps bilingual pages, feeds, and maps in sync.",
      sections: [
        {
          h: "Folder layout",
          p: "<pre><code>zh/  en/  assets/  tools/build.mjs  sitemap.xml</code></pre> Register new posts in the <code>ARTICLES</code> array, then run <code>npm run build</code>.",
        },
        {
          h: "New article checklist",
          p: "Set slug, date, bilingual copy, and sections—the build updates indexes, home “Latest”, RSS, search JSON, and sitemap when listed in <code>HOME_LATEST</code>.",
        },
        {
          h: "Images and video",
          p: "See <a href=\"webp-gallery-performance.html\">WebP gallery performance</a>. Host very large MP4 files on a CDN if needed.",
        },
      ],
    },
  },
];

/** 首页「最新内容」顺序（构建时在 PICTURES 可用后生成） */
const HOME_LATEST = [
  { type: "article", slug: "drone-aerial-city-photography" },
  { type: "article", slug: "webp-gallery-performance" },
  { type: "article", slug: "infinity-3d-brand-visuals" },
  { type: "gallery", slug: "tokyo-waterside-highway" },
  { type: "video", slug: "tech-visual-short" },
  { type: "article", slug: "self-hosted-video-seo" },
  { type: "article", slug: "tech-lifestyle-visual-storytelling" },
  { type: "gallery", slug: "haikou-shipyard-aerial" },
  { type: "article", slug: "welcome-aoglang" },
  { type: "video", slug: "warm-visual-clip" },
  { type: "video", slug: "hd-motion-visual" },
  { type: "gallery", slug: "infinity-3d" },
  { type: "article", slug: "static-site-guide" },
];

function articleBySlug(slug) {
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) throw new Error(`Unknown article slug: ${slug}`);
  return a;
}

function articleThumbProps(a, lang) {
  if (a.thumb) {
    return {
      src: a.thumb.src,
      w: a.thumb.w,
      h: a.thumb.h,
      alt: lang === "zh" ? a.thumb.altZh : a.thumb.altEn,
    };
  }
  return {
    src: "assets/img/placeholder.svg",
    w: 640,
    h: 360,
    alt: "",
  };
}

function articlePageBody(lang, a) {
  const isZh = lang === "zh";
  const loc = isZh ? a.zh : a.en;
  const otherLang = isZh ? "en" : "zh";
  const otherLabel = isZh ? "English" : "中文版";
  const intro = loc.intro ? `      <p>${loc.intro}</p>\n` : "";
  const sections = (loc.sections || [])
    .map((s) => `      <h2>${s.h}</h2>\n      <p>${s.p}</p>`)
    .join("\n");
  return `    <ol class="breadcrumb"><li><a href="../">${isZh ? "首页" : "Home"}</a></li><li><a href="./">${isZh ? "文章" : "Articles"}</a></li><li aria-current="page">${loc.title}</li></ol>
    <header class="article-header">
      <h1>${loc.title}</h1>
      <p class="card-meta">${a.date} · <a href="${crossLangHref(otherLang, `articles/${a.slug}.html`, 3)}" hreflang="${otherLang}">${otherLabel}</a></p>
    </header>
    <article class="prose">
${intro}${sections}
    </article>`;
}

function articleSchemaExtra(lang, a) {
  const loc = lang === "zh" ? a.zh : a.en;
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: loc.title,
    description: loc.desc,
    datePublished: a.date,
    inLanguage: lang === "zh" ? "zh-Hans" : "en",
  })}</script>`;
}

function articleIndexCard(lang, a) {
  const isZh = lang === "zh";
  const loc = isZh ? a.zh : a.en;
  const thumb = articleThumbProps(a, lang);
  return cardArticle({
    thumbStyle: cardThumbAttr(thumb.w, thumb.h),
    imgSrc: `../../${thumb.src}`,
    imgW: thumb.w,
    imgH: thumb.h,
    imgAlt: thumb.alt || loc.title,
    href: `${a.slug}.html`,
    heading: loc.title,
    meta: `<span class="tag">${isZh ? "文章" : "Article"}</span> ${a.date}`,
  });
}

function articleHomeCard(lang, a) {
  const isZh = lang === "zh";
  const loc = isZh ? a.zh : a.en;
  const thumb = articleThumbProps(a, lang);
  return cardArticle({
    thumbStyle: cardThumbAttr(thumb.w, thumb.h),
    imgSrc: `../${thumb.src}`,
    imgW: thumb.w,
    imgH: thumb.h,
    imgAlt: thumb.alt || loc.title,
    href: `articles/${a.slug}.html`,
    heading: loc.title,
    meta: `<span class="tag">${isZh ? "文章" : "Article"}</span> ${a.date}`,
    tag: "h3",
  });
}

function galleryHomeCardBySlug(lang, slug) {
  if (slug === "infinity-3d") {
    const isZh = lang === "zh";
    return cardArticle({
      thumbStyle: cardThumbAttr(1920, 1080),
      imgSrc: "../assets/img/gallery/wqd/wqd-01-thumb.webp",
      imgW: 1920,
      imgH: 1080,
      imgAlt: isZh ? "无穷符号 3D 视觉合辑" : "Infinity 3D collection",
      href: "gallery/infinity-3d.html",
      heading: isZh ? "无穷符号 3D 合辑" : "Infinity 3D collection",
      meta: isZh ? '<span class="tag">图集</span>10 张' : '<span class="tag">Gallery</span>10 images',
      tag: "h3",
    });
  }
  const p = PICTURES.find((x) => x.slug === slug);
  if (!p) throw new Error(`Unknown gallery slug for home: ${slug}`);
  const loc = lang === "zh" ? p.zh : p.en;
  return cardArticle({
    thumbStyle: cardThumbAttr(p.w, p.h),
    imgSrc: pictureAssetPath(p, "../", "thumb"),
    imgW: p.w,
    imgH: p.h,
    imgAlt: loc.title,
    href: `gallery/${p.slug}.html`,
    heading: loc.title,
    meta: `<span class="tag">${lang === "zh" ? "图片" : "Photo"}</span>`,
    tag: "h3",
  });
}

function videoHomeCardBySlug(lang, slug) {
  const v = VIDEOS.find((x) => x.slug === slug);
  if (!v) throw new Error(`Unknown video slug for home: ${slug}`);
  const isZh = lang === "zh";
  const loc = isZh ? v.zh : v.en;
  const dur = isZh ? v.durationZh : v.durationEn;
  return cardArticle({
    thumbStyle: cardThumbAttr(v.w, v.h),
    imgSrc: videoPosterSrc(v, "../"),
    imgW: v.w,
    imgH: v.h,
    imgAlt: loc.title,
    href: `videos/${v.slug}.html`,
    heading: loc.title,
    meta: `<span class="tag">${isZh ? "视频" : "Video"}</span> ${dur}`,
    tag: "h3",
  });
}

function homeLatestCards(lang) {
  return HOME_LATEST.map((item) => {
    if (item.type === "article") return articleHomeCard(lang, articleBySlug(item.slug));
    if (item.type === "gallery") return galleryHomeCardBySlug(lang, item.slug);
    if (item.type === "video") return videoHomeCardBySlug(lang, item.slug);
    throw new Error(`Unknown home latest type: ${item.type}`);
  }).join("\n      ");
}

function writeAllArticles() {
  for (const lang of ["zh", "en"]) {
    const isZh = lang === "zh";
    const sorted = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
    const cards = sorted.map((a) => articleIndexCard(lang, a)).join("\n      ");
    write(
      `${lang}/articles/index.html`,
      page(lang, 2, "articles", "articles/", {
        title: isZh ? "文章 — aoglang" : "Articles — aoglang",
        desc: isZh
          ? `${ARTICLES.length} 篇双语文章：航拍、图集性能、视频 SEO 与内容策划。`
          : `${ARTICLES.length} bilingual articles on aerials, gallery performance, video SEO, and content planning.`,
        canonical: `${SITE}/${lang}/articles/`,
      }, `    <h1>${isZh ? "文章" : "Articles"}</h1>
    <p class="gallery-intro">${isZh ? "教程、策划与 SEO 实践，配合本站图集与视频栏目。" : "Guides and SEO notes alongside our galleries and videos."}</p>
    <div class="masonry-grid">${cards}</div>`)
    );

    for (const a of ARTICLES) {
      const loc = isZh ? a.zh : a.en;
      write(
        `${lang}/articles/${a.slug}.html`,
        page(lang, 3, "articles", `articles/${a.slug}.html`, {
          title: `${loc.title} — ${isZh ? "文章" : "Article"} — aoglang`,
          desc: loc.desc,
          canonical: `${SITE}/${lang}/articles/${a.slug}.html`,
          type: "article",
          extra: articleSchemaExtra(lang, a),
        }, articlePageBody(lang, a))
      );
    }
  }
}

function writeHomePages() {
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
      ${homeLatestCards("zh")}
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
      ${homeLatestCards("en")}
    </div>
    </div>`,
      {
        bodyClass: "page-home-search",
        bodyAttrs: 'data-lang="en" data-search-index="../assets/data/search-index.json" data-search-base=""',
        extraScripts: ["search.js"],
      }
    )
  );
}

function syncUploadVideos() {
  const srcDir = path.join(root, "upload", "video");
  const mediaDir = path.join(root, "assets", "media", "video");
  const posterDir = path.join(root, "assets", "img", "video");
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.mkdirSync(posterDir, { recursive: true });

  for (const v of VIDEOS) {
    const src = path.join(srcDir, v.uploadFile);
    const dest = path.join(mediaDir, v.file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log("copied video", v.uploadFile, "→", path.relative(root, dest));
      const posterPath = path.join(posterDir, v.poster);
      if (!fs.existsSync(posterPath)) {
        try {
          execSync(
            `ffmpeg -y -i "${src}" -ss 00:00:01 -vframes 1 -q:v 3 "${posterPath}"`,
            { stdio: "ignore" }
          );
          console.log("poster", v.poster);
        } catch {
          console.warn("poster skip (ffmpeg):", v.poster);
        }
      }
    } else {
      console.warn("missing upload:", src);
    }
  }
}


syncUploadVideos();

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

const AERIAL_PICTURES = [
  {
    slug: "tokyo-waterside-highway",
    uploadFile:
      "kolang1399_a_drone_shot_of_the_waterside_highway_in_tokyo_at_du_e740beeb-96c2-4f20-ba85-1441f3c10fc7.png",
    file: "tokyo-waterside-highway.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "东京滨水高速航拍",
      desc: "无人机俯瞰东京滨水区与城市高速，黄昏光线下的交通流线与水面反光，呈现都市节奏与空间层次。",
      keywords: ["东京", "航拍", "无人机", "滨水", "高速公路", "城市", "黄昏", "日本", "aoglang"],
    },
    en: {
      title: "Tokyo waterside highway aerial",
      desc: "Drone view of Tokyo’s waterfront expressway at dusk—traffic streams, water reflections, and layered urban depth.",
      keywords: ["Tokyo", "aerial", "drone", "waterside", "highway", "urban", "dusk", "Japan", "aoglang"],
    },
  },
  {
    slug: "tokyo-highway-bridge-01",
    uploadFile:
      "kolang1399_cinematic_shot_of_tokyo_city._a_highway_bridge_with__4a9a455d-d4ea-4f7f-9498-ea7e35710b1b.png",
    file: "tokyo-highway-bridge-01.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "东京城市高架桥电影感航拍 I",
      desc: "电影感构图下的东京高架与桥梁，车辆光轨与楼宇轮廓交织，强调现代都市的交通动脉。",
      keywords: ["东京", "电影感", "高架桥", "航拍", "城市交通", "夜景", "建筑", "aoglang"],
    },
    en: {
      title: "Cinematic Tokyo highway bridge I",
      desc: "Cinematic aerial of a Tokyo highway bridge—light trails, skyline silhouettes, and the city’s transit backbone.",
      keywords: ["Tokyo", "cinematic", "highway", "bridge", "aerial", "traffic", "skyline", "aoglang"],
    },
  },
  {
    slug: "tokyo-highway-bridge-02",
    uploadFile:
      "kolang1399_cinematic_shot_of_tokyo_city._a_highway_bridge_with__5c46dae9-a7ac-4db0-9a69-b698bf6ffd46.png",
    file: "tokyo-highway-bridge-02.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "东京城市高架桥电影感航拍 II",
      desc: "另一视角的东京高架桥梁群，冷暖对比与纵深构图突出立体交通网络与都市密度。",
      keywords: ["东京", "高架", "桥梁", "航拍", "都市", "交通", "透视", "电影感", "aoglang"],
    },
    en: {
      title: "Cinematic Tokyo highway bridge II",
      desc: "Alternate angle on Tokyo’s elevated highways—depth, contrast, and dense urban infrastructure from above.",
      keywords: ["Tokyo", "elevated road", "bridge", "aerial", "urban", "transport", "perspective", "aoglang"],
    },
  },
  {
    slug: "wind-turbines-drone-01",
    uploadFile:
      "kolang1399_realistic_shot_of_a_drone_capturing_wind_turbines_on_c8dc7e9f-5762-42ab-ba7f-9dc7ead73d5b.png",
    file: "wind-turbines-drone-01.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "海上风力发电机航拍 I",
      desc: "无人机写实镜头下的海上风电场，风机阵列与海面天际线，传达清洁能源与壮阔尺度。",
      keywords: ["风电", "风力发电", "无人机", "航拍", "清洁能源", "海洋", "可持续", "aoglang"],
    },
    en: {
      title: "Offshore wind turbines aerial I",
      desc: "Realistic drone capture of offshore wind turbines—clean energy at scale against the open sea.",
      keywords: ["wind power", "turbines", "drone", "aerial", "renewable", "offshore", "sustainable", "aoglang"],
    },
  },
  {
    slug: "wind-turbines-drone-02",
    uploadFile:
      "kolang1399_realistic_shot_of_a_drone_capturing_wind_turbines_on_ecf389d8-c552-48cd-8be2-f4a302281350.png",
    file: "wind-turbines-drone-02.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "海上风力发电机航拍 II",
      desc: "风电场景的另一构图，强调风机叶片几何与海面纹理，适合能源、环保主题内容配图。",
      keywords: ["风电场", "航拍", "叶片", "海洋", "绿色能源", "环保", "无人机", "aoglang"],
    },
    en: {
      title: "Offshore wind turbines aerial II",
      desc: "Second composition of offshore turbines—blade geometry and sea texture for energy and eco-themed stories.",
      keywords: ["wind farm", "aerial", "blades", "ocean", "green energy", "eco", "drone", "aoglang"],
    },
  },
  {
    slug: "fuzhou-stadium-aerial-01",
    uploadFile:
      "kolang1399_the_video_features_aerial_footage_of_the_fuzhou_stad_810b5b8f-a35d-4f7c-b8fd-d0aec5ad5569.png",
    file: "fuzhou-stadium-aerial-01.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "福州体育场航拍 I",
      desc: "福州体育场馆及周边城市肌理航拍，展现大型公建与城市格局的鸟瞰视角。",
      keywords: ["福州", "体育场", "航拍", "建筑", "城市", "公建", "鸟瞰", "福建", "aoglang"],
    },
    en: {
      title: "Fuzhou stadium aerial I",
      desc: "Bird’s-eye view of Fuzhou’s stadium and surrounding urban fabric—landmark architecture in context.",
      keywords: ["Fuzhou", "stadium", "aerial", "architecture", "urban", "landmark", "Fujian", "aoglang"],
    },
  },
  {
    slug: "fuzhou-stadium-aerial-02",
    uploadFile:
      "kolang1399_the_video_features_aerial_footage_of_the_fuzhou_stad_daa7dcb3-d1f4-4354-b25c-6ef6ed49c3b5.png",
    file: "fuzhou-stadium-aerial-02.png",
    subdir: "pictures",
    w: 1920,
    h: 1080,
    date: "2025-11-26",
    zh: {
      title: "福州体育场航拍 II",
      desc: "体育场区域的另一航拍角度，突出场馆轮廓、道路系统与周边街区，适合旅行与城市摄影栏目。",
      keywords: ["福州", "体育馆", "无人机", "城市摄影", "旅行", "福建", "地标", "aoglang"],
    },
    en: {
      title: "Fuzhou stadium aerial II",
      desc: "Alternate aerial of the Fuzhou stadium zone—roads, blocks, and landmark curves for travel and city photo stories.",
      keywords: ["Fuzhou", "arena", "drone", "city photography", "travel", "landmark", "aoglang"],
    },
  },
  {
    slug: "urban-snapshot-b2",
    uploadFile: "b2.jpg",
    file: "urban-snapshot-b2.jpg",
    subdir: "pictures",
    w: 1600,
    h: 1067,
    date: "2025-11-27",
    zh: {
      title: "都市街景快照",
      desc: "街头瞬间抓拍，记录城市日常光影与行人节奏，适合生活方式与纪实类内容配图。",
      keywords: ["街景", "都市", "街拍", "纪实", "生活方式", "城市", "摄影", "aoglang"],
    },
    en: {
      title: "Urban street snapshot",
      desc: "A candid street moment—everyday light and rhythm for lifestyle and documentary-style visuals.",
      keywords: ["street", "urban", "snapshot", "documentary", "lifestyle", "city", "photography", "aoglang"],
    },
  },
];

function pictureSections(loc, isZh) {
  const kw = loc.keywords.join(isZh ? "、" : ", ");
  return [
    { h: isZh ? "画面介绍" : "About this image", p: loc.desc },
    {
      h: isZh ? "使用与分享" : "Use & share",
      p: isZh
        ? "本页为独立图片作品，含标题、描述与关键词，便于搜索引擎收录。转载或引用时请链接此页并注明 <strong>aoglang</strong>。"
        : "This dedicated page includes title, description, and tags for SEO. Link here and credit <strong>aoglang</strong> when republishing.",
    },
    {
      h: isZh ? "相关检索" : "Related search terms",
      p: isZh
        ? `常见检索词：${kw}。更多作品请浏览<a href="./">图集首页</a>。`
        : `Common terms: ${kw}. Browse the <a href="./">gallery index</a> for more.`,
    },
  ];
}

/** 从 upload 文件名解析 Midjourney 提示词片段 */
function promptFromUploadFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const m = base.match(/^kolang1399_(.+)_([a-f0-9-]{36})$/i);
  if (m) return m[1].replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return base.replace(/_/g, " ");
}

function titleCaseWords(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const pictureInferCounters = {
  protectiveSuit: 0,
  waferChip: 0,
};

/** 根据提示词生成双语 SEO（upload 新图自动入库） */
function inferPictureMeta(prompt, uploadFile) {
  const p = prompt.toLowerCase();
  let slug;
  let zh;
  let en;

  const finish = (s, z, e) => {
    slug = s;
    zh = z;
    en = e;
  };

  if (/iphone.*screen/i.test(prompt)) {
    finish(
      "iphone-screen-closeup",
      {
        title: "iPhone 屏幕特写",
        desc: "智能手机屏幕特写画面，突出玻璃质感与界面光感，适合科技产品、数码评测类内容配图。",
        keywords: ["iPhone", "手机", "屏幕", "特写", "科技", "数码", "aoglang"],
      },
      {
        title: "iPhone screen close-up",
        desc: "Close-up of a smartphone screen—glass reflections and UI glow for tech and gadget features.",
        keywords: ["iPhone", "smartphone", "screen", "close-up", "tech", "digital", "aoglang"],
      }
    );
  } else if (/protective sui|protective suit|white protective/i.test(prompt)) {
    pictureInferCounters.protectiveSuit += 1;
    const n = pictureInferCounters.protectiveSuit;
    finish(
      `protective-suit-portrait-${String(n).padStart(2, "0")}`,
      {
        title: `防护服人物特写 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "白色防护服人物近景，强调安全、医疗或洁净场景氛围，适合科普与工业安全类视觉。",
        keywords: ["防护服", "人物", "特写", "安全", "医疗", "工业", "aoglang"],
      },
      {
        title: `Protective suit portrait ${n > 1 ? n : ""}`.trim(),
        desc: "Close-up portrait in a white protective suit—safety, medical, or cleanroom visual context.",
        keywords: ["protective suit", "portrait", "safety", "medical", "industrial", "aoglang"],
      }
    );
  } else if (/hand.*finger.*energy|wave of ener/i.test(prompt)) {
    finish(
      "hand-energy-gesture",
      {
        title: "指尖能量波纹",
        desc: "手指触碰空气、能量波纹扩散的创意画面，适合科技交互、UI 概念与未来感视觉。",
        keywords: ["手势", "能量", "科技", "交互", "创意", "未来感", "aoglang"],
      },
      {
        title: "Hand energy gesture",
        desc: "A finger touches the air with rippling energy—futuristic UI and interaction concept art.",
        keywords: ["hand", "energy", "tech", "interaction", "futuristic", "concept", "aoglang"],
      }
    );
  } else if (/headphones.*desk/i.test(prompt)) {
    finish(
      "desk-headphones-work",
      {
        title: "戴耳机办公",
        desc: "戴耳机伏案工作的人物场景，传递专注、远程办公与数字生活方式。",
        keywords: ["耳机", "办公", "远程工作", "专注", "生活方式", "人物", "aoglang"],
      },
      {
        title: "Working with headphones",
        desc: "Person at a desk with headphones—focus, remote work, and digital lifestyle storytelling.",
        keywords: ["headphones", "desk", "remote work", "focus", "lifestyle", "aoglang"],
      }
    );
  } else if (/senior.*outdoor chair|outdoor chair/i.test(prompt)) {
    finish(
      "senior-outdoor-relax",
      {
        title: "户外椅上的长者",
        desc: "长者坐在户外椅上休憩，温暖自然光与宁静氛围，适合养老、健康与生活类内容。",
        keywords: ["长者", "户外", "休憩", "生活方式", "健康", "摄影", "aoglang"],
      },
      {
        title: "Senior relaxing outdoors",
        desc: "A senior person seated outdoors in calm light—wellness, leisure, and gentle lifestyle imagery.",
        keywords: ["senior", "outdoor", "relax", "wellness", "lifestyle", "aoglang"],
      }
    );
  } else if (/water ripples|blurred background/i.test(prompt)) {
    finish(
      "abstract-water-ripples",
      {
        title: "抽象水波纹理",
        desc: "虚化的水波与涟漪抽象背景，柔和色调适合冥想、SPA、自然与背景素材场景。",
        keywords: ["水波", "抽象", "背景", "纹理", "冥想", "自然", "aoglang"],
      },
      {
        title: "Abstract water ripples",
        desc: "Soft blurred water ripples—abstract background for wellness, nature, and calm visual themes.",
        keywords: ["water", "ripples", "abstract", "background", "wellness", "nature", "aoglang"],
      }
    );
  } else if (/shipyard|haikou|cargo ship/i.test(prompt)) {
    finish(
      "haikou-shipyard-aerial",
      {
        title: "海口船厂航拍",
        desc: "海口船厂与货船鸟瞰视角，展现港口物流、造船工业与海岸经济活力。",
        keywords: ["海口", "船厂", "航拍", "港口", "货船", "物流", "工业", "aoglang"],
      },
      {
        title: "Haikou shipyard aerial",
        desc: "Aerial view of Haikou shipyard and cargo vessels—port logistics and coastal industry.",
        keywords: ["Haikou", "shipyard", "aerial", "port", "cargo", "logistics", "aoglang"],
      }
    );
  } else if (/woman.*hand|pink nails/i.test(prompt)) {
    finish(
      "hand-pink-nails-closeup",
      {
        title: "美甲手部特写",
        desc: "女性手部与粉色美甲特写，适合美容、时尚、护肤与生活方式类视觉内容。",
        keywords: ["美甲", "手部", "特写", "美容", "时尚", "护肤", "aoglang"],
      },
      {
        title: "Hand with pink nails",
        desc: "Close-up of a woman's hand with pink nail polish—beauty, fashion, and lifestyle visuals.",
        keywords: ["nails", "hand", "beauty", "fashion", "close-up", "lifestyle", "aoglang"],
      }
    );
  } else if (/computer technician|technology office/i.test(prompt)) {
    finish(
      "computer-technician-office",
      {
        title: "电脑技术员办公",
        desc: "技术员在简约办公室操作电脑，强调 IT 支持、企业科技与数字化运维场景。",
        keywords: ["电脑", "技术员", "办公室", "IT", "科技", "运维", "aoglang"],
      },
      {
        title: "Computer technician at work",
        desc: "Technician working at a computer in a clean office—IT support and enterprise tech.",
        keywords: ["technician", "computer", "office", "IT", "technology", "aoglang"],
      }
    );
  } else if (/electric grid|electric current|dynamic lines/i.test(prompt)) {
    finish(
      "electric-grid-energy-lines",
      {
        title: "电网能量流光",
        desc: "电网与电流动态光线效果，充满科技张力，适合能源、电力与高科技主题配图。",
        keywords: ["电网", "电流", "能源", "科技", "光效", "电力", "aoglang"],
      },
      {
        title: "Electric grid energy lines",
        desc: "Dynamic light lines suggesting electric current—energy, power, and high-tech themes.",
        keywords: ["electric", "grid", "energy", "light", "technology", "power", "aoglang"],
      }
    );
  } else if (/laptop.*news/i.test(prompt)) {
    finish(
      "laptop-news-desk",
      {
        title: "笔记本与新闻资讯",
        desc: "笔记本电脑与新闻、报纸资讯场景，适合媒体、资讯与商务办公类内容。",
        keywords: ["笔记本", "新闻", "资讯", "媒体", "办公", "报纸", "aoglang"],
      },
      {
        title: "Laptop and news media",
        desc: "Laptop with news and newspaper elements—media, information, and business desk visuals.",
        keywords: ["laptop", "news", "media", "newspaper", "business", "aoglang"],
      }
    );
  } else if (/\bai\b|artificial int|high-tech light/i.test(p)) {
    finish(
      "ai-high-tech-lights",
      {
        title: "AI 高科技光效",
        desc: "人工智能与高科技光效视觉，蓝紫色调与未来感线条，适合 AI、科技品牌与发布会素材。",
        keywords: ["AI", "人工智能", "高科技", "光效", "未来感", "科技", "aoglang"],
      },
      {
        title: "AI high-tech light effects",
        desc: "Futuristic light effects for AI and high-tech branding—glow, beams, and digital atmosphere.",
        keywords: ["AI", "high-tech", "lights", "futuristic", "technology", "aoglang"],
      }
    );
  } else if (/earth from space/i.test(prompt)) {
    finish(
      "earth-from-space",
      {
        title: "太空视角地球",
        desc: "从太空俯瞰地球的背景画面，适合环保、航天、全球议题与科幻类视觉。",
        keywords: ["地球", "太空", "航天", "环保", "全球", "科幻", "aoglang"],
      },
      {
        title: "Earth from space",
        desc: "Earth seen from space—planet backdrop for climate, space, and global storytelling.",
        keywords: ["Earth", "space", "planet", "climate", "global", "aoglang"],
      }
    );
  } else if (/hikers.*mountain|mountain look/i.test(prompt)) {
    finish(
      "hikers-mountain-summit",
      {
        title: "山顶徒步者",
        desc: "三名徒步者站在山顶眺望远方，传达户外探险、旅行与团队精神。",
        keywords: ["徒步", "登山", "山顶", "户外", "旅行", "风景", "aoglang"],
      },
      {
        title: "Hikers on mountain summit",
        desc: "Three hikers on a mountain top—outdoor adventure, travel, and team spirit.",
        keywords: ["hikers", "mountain", "summit", "outdoor", "travel", "adventure", "aoglang"],
      }
    );
  } else if (/newspaper.*top view|top view.*newspaper/i.test(prompt)) {
    finish(
      "newspaper-top-view",
      {
        title: "报纸俯拍",
        desc: "黑白报纸俯拍构图，复古新闻质感，适合媒体、历史与 editorial 设计。",
        keywords: ["报纸", "俯拍", "黑白", "媒体", "新闻", "复古", "aoglang"],
      },
      {
        title: "Newspaper top view",
        desc: "Top-down black-and-white newspaper layout—editorial and media-themed visuals.",
        keywords: ["newspaper", "top view", "editorial", "media", "monochrome", "aoglang"],
      }
    );
  } else if (/wafer|chip inspection/i.test(prompt)) {
    pictureInferCounters.waferChip += 1;
    const n = pictureInferCounters.waferChip;
    finish(
      `wafer-chip-inspection-${String(n).padStart(2, "0")}`,
      {
        title: `晶圆芯片检测特写 ${n}`,
        desc: "晶圆与芯片检测工业特写，强调半导体制造、精密科技与微观工艺。",
        keywords: ["晶圆", "芯片", "半导体", "工业", "检测", "科技", "特写", "aoglang"],
      },
      {
        title: `Wafer chip inspection ${n}`,
        desc: "Industrial close-up of wafer and chip inspection—semiconductor manufacturing precision.",
        keywords: ["wafer", "chip", "semiconductor", "industrial", "inspection", "tech", "aoglang"],
      }
    );
  }

  if (!slug) {
    const base = uploadFile.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const enTitle = titleCaseWords(prompt);
    slug = base.replace(/^-+|-+$/g, "") || "upload-photo";
    zh = {
      title: enTitle,
      desc: `来自 upload 图库的视觉作品「${enTitle}」，独立页面含中文说明与关键词，便于搜索与分享。`,
      keywords: ["摄影", "图集", "视觉", "aoglang", "upload"],
    };
    en = {
      title: enTitle,
      desc: `Visual from the aoglang upload gallery: ${enTitle}. Dedicated bilingual page for SEO and sharing.`,
      keywords: ["photo", "gallery", "visual", "aoglang", "upload"],
    };
  }

  return { slug, zh, en };
}

function uniquePictureSlug(slug, usedSlugs) {
  let s = slug;
  let n = 1;
  while (usedSlugs.has(s)) {
    n += 1;
    s = `${slug}-${String(n).padStart(2, "0")}`;
  }
  usedSlugs.add(s);
  return s;
}

function pictureEntryFromUpload(uploadFile, usedSlugs) {
  const prompt = promptFromUploadFilename(uploadFile);
  const { slug: rawSlug, zh, en } = inferPictureMeta(prompt, uploadFile);
  const slug = uniquePictureSlug(rawSlug, usedSlugs);
  const ext = path.extname(uploadFile).toLowerCase();
  return {
    slug,
    uploadFile,
    file: `${slug}${ext}`,
    subdir: "pictures",
    w: ext === ".jpg" || ext === ".jpeg" ? 1600 : 1920,
    h: ext === ".jpg" || ext === ".jpeg" ? 1067 : 1080,
    date: "2026-05-27",
    zh: { ...zh, sections: pictureSections(zh, true) },
    en: { ...en, sections: pictureSections(en, false) },
  };
}

/** 扫描 upload/picture，自动加入未在 AERIAL / WQD 登记的新图 */
function discoverUploadPictures(usedSlugs) {
  const srcDir = path.join(root, "upload", "picture");
  if (!fs.existsSync(srcDir)) return [];

  const known = new Set(
    [
      ...AERIAL_PICTURES.map((p) => p.uploadFile.toLowerCase()),
      ...WQD_GALLERY.map((_, i) => `wqd${i + 1}.png`),
    ].map((f) => f.toLowerCase())
  );

  return fs
    .readdirSync(srcDir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .filter((f) => !/^wqd\d+\.png$/i.test(f))
    .filter((f) => !known.has(f.toLowerCase()))
    .map((uploadFile) => pictureEntryFromUpload(uploadFile, usedSlugs));
}

function buildPicturesCatalog() {
  pictureInferCounters.protectiveSuit = 0;
  pictureInferCounters.waferChip = 0;

  const usedSlugs = new Set();
  const aerial = AERIAL_PICTURES.map((p) => {
    usedSlugs.add(p.slug);
    return {
      ...p,
      zh: { ...p.zh, sections: pictureSections(p.zh, true) },
      en: { ...p.en, sections: pictureSections(p.en, false) },
    };
  });
  const discovered = discoverUploadPictures(usedSlugs);
  if (discovered.length) {
    console.log("discovered", discovered.length, "new picture(s) from upload/picture");
  }

  const wqd = WQD_GALLERY.map((item, i) => {
    const slug = `wqd-${String(i + 1).padStart(2, "0")}`;
    usedSlugs.add(slug);
    return {
      slug,
      uploadFile: `wqd${i + 1}.png`,
      file: item.file,
      subdir: "wqd",
      w: item.w,
      h: item.h,
      date: "2026-05-27",
      collection: INFINITY_SLUG,
      zh: { ...item.zh, sections: pictureSections(item.zh, true) },
      en: { ...item.en, sections: pictureSections(item.en, false) },
    };
  });
  return [...aerial, ...discovered, ...wqd];
}

const PICTURES = buildPicturesCatalog();

const IMAGE_MAIN_MAX = 1400;
const IMAGE_THUMB_MAX = 480;
const WEBP_QUALITY_MAIN = 82;
const WEBP_QUALITY_THUMB = 78;

function pictureBasename(p) {
  return path.basename(p.file, path.extname(p.file));
}

function pictureWebpFile(p, variant = "main") {
  const base = pictureBasename(p);
  return variant === "thumb" ? `${base}-thumb.webp` : `${base}.webp`;
}

function pictureAssetPath(p, prefix = "../../", variant = "main") {
  return `${prefix}assets/img/gallery/${p.subdir}/${pictureWebpFile(p, variant)}`;
}

/** 从 upload 生成 WebP 主图（≤1400px）与缩略图（≤480px），替换原 PNG/JPG */
async function optimizeGalleryImage(srcPath, destDir, basename) {
  const mainPath = path.join(destDir, `${basename}.webp`);
  const thumbPath = path.join(destDir, `${basename}-thumb.webp`);
  const input = sharp(srcPath);
  const meta = await input.metadata();
  const srcW = meta.width || IMAGE_MAIN_MAX;
  const mainW = Math.min(srcW, IMAGE_MAIN_MAX);
  await input
    .clone()
    .resize(mainW, null, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: WEBP_QUALITY_MAIN, effort: 4 })
    .toFile(mainPath);
  const thumbW = Math.min(srcW, IMAGE_THUMB_MAX);
  await sharp(srcPath)
    .resize(thumbW, null, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: WEBP_QUALITY_THUMB, effort: 4 })
    .toFile(thumbPath);
  const mainMeta = await sharp(mainPath).metadata();
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    const legacy = path.join(destDir, `${basename}${ext}`);
    if (fs.existsSync(legacy)) {
      try {
        fs.unlinkSync(legacy);
      } catch (_) {
        /* ignore */
      }
    }
  }
  return { w: mainMeta.width || mainW, h: mainMeta.height || Math.round(mainW * 0.5625) };
}

async function syncUploadPictures() {
  const srcDir = path.join(root, "upload", "picture");
  for (const p of PICTURES) {
    const src = path.join(srcDir, p.uploadFile);
    const destDir = path.join(root, "assets", "img", "gallery", p.subdir);
    const basename = pictureBasename(p);
    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(src)) {
      const mainPath = path.join(destDir, `${basename}.webp`);
      if (fs.existsSync(mainPath)) {
        const mainMeta = await sharp(mainPath).metadata();
        p.w = mainMeta.width || p.w;
        p.h = mainMeta.height || p.h;
        console.log("keep existing", path.relative(root, mainPath));
        continue;
      }
      console.warn("missing picture:", src);
      continue;
    }
    const dims = await optimizeGalleryImage(src, destDir, basename);
    p.w = dims.w;
    p.h = dims.h;
    const mainRel = path.join("assets", "img", "gallery", p.subdir, pictureWebpFile(p));
    const mainKb = Math.round(fs.statSync(path.join(root, mainRel)).size / 1024);
    const thumbKb = Math.round(
      fs.statSync(path.join(root, "assets", "img", "gallery", p.subdir, pictureWebpFile(p, "thumb"))).size / 1024
    );
    console.log(
      "optimized picture",
      p.uploadFile,
      "→",
      path.relative(root, path.join(root, mainRel)),
      `(${mainKb}KB + thumb ${thumbKb}KB)`
    );
  }
}

await syncUploadPictures();

function wqdFiguresHtml(lang, assetPrefix) {
  const isZh = lang === "zh";
  return WQD_GALLERY.map((item, i) => {
    const loc = isZh ? item.zh : item.en;
    const slug = `wqd-${String(i + 1).padStart(2, "0")}`;
    const tags = loc.keywords.map((k) => `<span class="tag">${k}</span>`).join("");
    const thumbFile = `wqd-${String(i + 1).padStart(2, "0")}-thumb.webp`;
    return `<figure${cardThumbAttr(item.w, item.h)}>
        <a href="${slug}.html"><img src="${assetPrefix}assets/img/gallery/wqd/${thumbFile}" width="${item.w}" height="${item.h}" alt="${loc.title}" loading="lazy" decoding="async"></a>
        <figcaption>
          <strong><a href="${slug}.html">${loc.title}</a></strong>
          <p>${loc.desc}</p>
          <p class="gallery-keywords">${tags}</p>
        </figcaption>
      </figure>`;
  }).join("\n      ");
}

function pictureTagsHtml(tags) {
  return tags.map((t) => `<span class="tag">${t}</span>`).join("");
}

function picturePageBody(lang, p) {
  const isZh = lang === "zh";
  const loc = isZh ? p.zh : p.en;
  const otherLang = isZh ? "en" : "zh";
  const otherLabel = isZh ? "English" : "中文版";
  const assetP = relPrefix(3);
  const imgSrc = pictureAssetPath(p, assetP, "main");
  const sections = loc.sections
    .map((s) => `      <h2>${s.h}</h2>\n      <p>${s.p}</p>`)
    .join("\n");
  const collectionLink = p.collection
    ? `<p class="card-meta">${isZh ? "所属合辑：" : "Collection: "}<a href="${p.collection}.html">${isZh ? "无穷符号 3D 视觉" : "Infinity 3D visuals"}</a></p>`
    : "";

  return `    <ol class="breadcrumb"><li><a href="../">${isZh ? "首页" : "Home"}</a></li><li><a href="./">${isZh ? "图集" : "Gallery"}</a></li><li aria-current="page">${loc.title}</li></ol>
    <header class="article-header">
      <h1>${loc.title}</h1>
      <p class="card-meta">${p.w}×${p.h} · ${p.date} · <a href="${crossLangHref(otherLang, `gallery/${p.slug}.html`, 3)}" hreflang="${otherLang}">${otherLabel}</a></p>
      ${collectionLink}
      <p class="gallery-intro">${loc.desc}</p>
    </header>
    <article class="prose picture-article">
      <figure class="picture-hero"${cardThumbAttr(p.w, p.h)}>
        <img src="${imgSrc}" width="${p.w}" height="${p.h}" alt="${loc.title}" loading="eager" decoding="async">
      </figure>
${sections}
      <h2>${isZh ? "关键词" : "Keywords"}</h2>
      <p class="gallery-keywords">${pictureTagsHtml(loc.keywords)}</p>
      <p>${isZh ? "更多：" : "More: "}<a href="./">${isZh ? "全部图片" : "All images"}</a>${p.collection ? ` · <a href="${p.collection}.html">${isZh ? "3D 无穷合辑" : "Infinity set"}</a>` : ""} · <a href="../videos/">${isZh ? "视频" : "Videos"}</a></p>
    </article>`;
}

function pictureSchemaJson(lang, p) {
  const loc = lang === "zh" ? p.zh : p.en;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: loc.title,
    description: loc.desc,
    contentUrl: `${SITE}/assets/img/gallery/${p.subdir}/${pictureWebpFile(p)}`,
    width: p.w,
    height: p.h,
    datePublished: p.date,
    inLanguage: lang === "zh" ? "zh-Hans" : "en",
  });
}

function galleryIndexCards(isZh) {
  const pictureCards = PICTURES.map((p) => {
    const loc = isZh ? p.zh : p.en;
    return cardArticle({
      thumbStyle: cardThumbAttr(p.w, p.h),
      imgSrc: pictureAssetPath(p, "../../", "thumb"),
      imgW: p.w,
      imgH: p.h,
      imgAlt: loc.title,
      href: `${p.slug}.html`,
      heading: loc.title,
      meta: `<span class="tag">${isZh ? "图片" : "Photo"}</span>`,
    });
  }).join("\n      ");
  const spring = cardArticle({
    thumbStyle: cardThumbAttr(800, 600),
    imgSrc: "../../assets/img/gallery/spring-1.svg",
    imgW: 800,
    imgH: 600,
    imgAlt: isZh ? "春日图集" : "Spring scenes",
    href: "spring-scenes.html",
    heading: isZh ? "春日图集（示例）" : "Spring scenes (demo)",
    meta: isZh ? '<span class="tag">示例</span>6 张' : '<span class="tag">Demo</span>6 photos',
  });
  const infinity = cardArticle({
    thumbStyle: cardThumbAttr(1920, 1080),
    imgSrc: "../../assets/img/gallery/wqd/wqd-01-thumb.webp",
    imgW: 1920,
    imgH: 1080,
    imgAlt: isZh ? "无穷符号 3D 视觉合辑" : "Infinity 3D collection",
    href: `${INFINITY_SLUG}.html`,
    heading: isZh ? "无穷符号 3D 合辑" : "Infinity 3D collection",
    meta: isZh ? '<span class="tag">合辑</span>10 张' : '<span class="tag">Set</span>10 images',
  });
  return `${pictureCards}\n      ${infinity}\n      ${spring}`;
}

for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  const listDesc = isZh
    ? `${PICTURES.length} 张独立图片页：航拍、城市、风电与 3D 无穷视觉，每张含双语说明与 ImageObject 结构化数据。`
    : `${PICTURES.length} dedicated image pages—aerial, urban, wind energy & 3D infinity art with bilingual SEO copy.`;

  write(
    `${lang}/gallery/index.html`,
    page(
      lang,
      2,
      "gallery",
      "gallery/",
      {
        title: isZh ? "图集 — aoglang" : "Gallery — aoglang",
        desc: listDesc,
        canonical: `${SITE}/${lang}/gallery/`,
      },
      `    <h1>${isZh ? "图集" : "Gallery"}</h1>
    <p class="gallery-intro">${listDesc}</p>
    <div class="masonry-grid">${galleryIndexCards(isZh)}</div>`
    )
  );

  for (const p of PICTURES) {
    const loc = isZh ? p.zh : p.en;
    write(
      `${lang}/gallery/${p.slug}.html`,
      page(lang, 3, "gallery", `gallery/${p.slug}.html`, {
        title: `${loc.title} — ${isZh ? "图片" : "Photo"} — aoglang`,
        desc: loc.desc,
        canonical: `${SITE}/${lang}/gallery/${p.slug}.html`,
        type: "article",
        extra: `<script type="application/ld+json">${pictureSchemaJson(lang, p)}</script>`,
      }, picturePageBody(lang, p))
    );
  }

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
    <header class="article-header"><h1>春日图集</h1><p class="card-meta"><a href="${crossLangHref("en", "gallery/spring-scenes.html", 3)}" hreflang="en">English</a></p></header>
    <div class="gallery-grid prose-wide">${figs}</div>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Gallery</a></li><li aria-current="page">Spring scenes</li></ol>
    <header class="article-header"><h1>Spring scenes</h1><p class="card-meta"><a href="${crossLangHref("zh", "gallery/spring-scenes.html", 3)}" hreflang="zh">中文版</a></p></header>
    <div class="gallery-grid prose-wide">${figs}</div>`
    )
  );

  const wqdFigs = wqdFiguresHtml(lang, relPrefix(3));
  const metaZh = {
    title: "无穷符号 3D 视觉图集 — aoglang",
    desc: "十张无穷符号主题 3D 视觉作品，附中文说明与搜索关键词。",
    intro: "十张三维无穷符号与缎带抽象视觉合辑；每张作品另有独立页面（见下方卡片链接），便于 SEO 与分享。",
    h1: "无穷符号 3D 视觉",
  };
  const metaEn = {
    title: "Infinity 3D visual gallery — aoglang",
    desc: "Ten infinity-themed 3D visuals with captions and searchable keywords.",
    intro: "Ten infinity-themed 3D visuals in one collection—each piece also has its own dedicated page (links below).",
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
      <p class="card-meta">${isZh ? "10 张" : "10 images"} · <a href="${crossLangHref(otherLang, `gallery/${INFINITY_SLUG}.html`, 3)}" hreflang="${otherLang}">${otherLabel}</a></p>
      <p class="gallery-intro">${m.intro}</p>
    </header>
    <div class="gallery-grid prose-wide">${wqdFigs}</div>`
    )
  );
}

// Videos
function videoPosterSrc(v, depthPrefix = "../../") {
  const posterPath = path.join(root, "assets", "img", "video", v.poster);
  if (fs.existsSync(posterPath)) {
    return `${depthPrefix}assets/img/video/${v.poster}`;
  }
  return `${depthPrefix}assets/img/video-poster.svg`;
}

function videoIndexCards(isZh) {
  return VIDEOS.map((v) => {
    const loc = isZh ? v.zh : v.en;
    const dur = isZh ? v.durationZh : v.durationEn;
    return cardArticle({
      thumbStyle: cardThumbAttr(v.w, v.h),
      imgSrc: videoPosterSrc(v, "../../"),
      imgW: v.w,
      imgH: v.h,
      imgAlt: loc.title,
      href: `${v.slug}.html`,
      heading: loc.title,
      meta: `<span class="tag">${isZh ? "视频" : "Video"}</span> ${dur}`,
    });
  }).join("\n      ");
}

function videoHomeCards(lang) {
  return VIDEOS.map((v) => {
    const isZh = lang === "zh";
    const loc = isZh ? v.zh : v.en;
    const dur = isZh ? v.durationZh : v.durationEn;
    return cardArticle({
      thumbStyle: cardThumbAttr(v.w, v.h),
      imgSrc: videoPosterSrc(v, "../"),
      imgW: v.w,
      imgH: v.h,
      imgAlt: loc.title,
      href: `videos/${v.slug}.html`,
      heading: loc.title,
      meta: `<span class="tag">${isZh ? "视频" : "Video"}</span> ${dur}`,
      tag: "h3",
    });
  }).join("\n      ");
}

function videoTagsHtml(tags) {
  return tags.map((t) => `<span class="tag">${t}</span>`).join("");
}

function videoPageBody(lang, v) {
  const isZh = lang === "zh";
  const loc = isZh ? v.zh : v.en;
  const otherLang = isZh ? "en" : "zh";
  const otherLabel = isZh ? "English" : "中文版";
  const dur = isZh ? v.durationZh : v.durationEn;
  const p = relPrefix(3);
  const poster = videoPosterSrc(v, p);
  const videoSrc = `${p}assets/media/video/${v.file}`;
  const sections = loc.sections
    .map((s) => `      <h2>${s.h}</h2>\n      <p>${s.p}</p>`)
    .join("\n");
  const resLabel = `${v.w}×${v.h}`;

  return `    <ol class="breadcrumb"><li><a href="../">${isZh ? "首页" : "Home"}</a></li><li><a href="./">${isZh ? "视频" : "Videos"}</a></li><li aria-current="page">${loc.title}</li></ol>
    <header class="article-header">
      <h1>${loc.title}</h1>
      <p class="card-meta">${dur} · ${resLabel} · ${v.date} · <a href="${crossLangHref(otherLang, `videos/${v.slug}.html`, 3)}" hreflang="${otherLang}">${otherLabel}</a></p>
      <p class="gallery-intro">${loc.desc}</p>
    </header>
    <article class="prose video-article">
      <video class="player" controls width="100%" preload="metadata" playsinline poster="${poster}">
        <source src="${videoSrc}" type="video/mp4">
        ${isZh ? "您的浏览器不支持 HTML5 视频播放。" : "Your browser does not support HTML5 video."}
      </video>
      <p class="video-meta">${isZh ? "格式：MP4（H.264）· 自托管" : "Format: MP4 (H.264) · self-hosted"}</p>
${sections}
      <h2>${isZh ? "相关标签" : "Tags"}</h2>
      <p class="gallery-keywords">${videoTagsHtml(loc.tags)}</p>
      <p>${isZh ? "更多内容：" : "More: "}<a href="./">${isZh ? "全部视频" : "All videos"}</a> · <a href="../gallery/">${isZh ? "图集" : "Gallery"}</a> · <a href="../articles/">${isZh ? "文章" : "Articles"}</a></p>
    </article>`;
}

function videoSchemaJson(lang, v) {
  const loc = lang === "zh" ? v.zh : v.en;
  const contentUrl = `${SITE}/assets/media/video/${v.file}`;
  const thumb = fs.existsSync(path.join(root, "assets", "img", "video", v.poster))
    ? `${SITE}/assets/img/video/${v.poster}`
    : `${SITE}/assets/img/video-poster.svg`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: loc.title,
    description: loc.desc,
    thumbnailUrl: thumb,
    contentUrl,
    uploadDate: v.date,
    duration: v.durationIso,
    inLanguage: lang === "zh" ? "zh-Hans" : "en",
  });
}

for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  const listDesc = isZh
    ? "自托管 MP4 短片：暖色视觉与高清动感片段，附双语说明与 VideoObject 结构化数据。"
    : "Self-hosted MP4 clips with bilingual captions, posters, and VideoObject schema for SEO.";

  write(
    `${lang}/videos/index.html`,
    page(
      lang,
      2,
      "videos",
      "videos/",
      {
        title: isZh ? "视频 — aoglang" : "Videos — aoglang",
        desc: listDesc,
        canonical: `${SITE}/${lang}/videos/`,
      },
      `    <h1>${isZh ? "视频" : "Videos"}</h1>
    <p class="gallery-intro">${listDesc}</p>
    <div class="masonry-grid">${videoIndexCards(isZh)}</div>
    <p class="prose" style="margin-top:2rem"><a href="intro-aoglang.html">${isZh ? "HTML5 播放与嵌入示例" : "HTML5 & embed demo"}</a></p>`
    )
  );

  for (const v of VIDEOS) {
    const loc = isZh ? v.zh : v.en;
    write(
      `${lang}/videos/${v.slug}.html`,
      page(lang, 3, "videos", `videos/${v.slug}.html`, {
        title: `${loc.title} — ${isZh ? "视频" : "Video"} — aoglang`,
        desc: loc.desc,
        canonical: `${SITE}/${lang}/videos/${v.slug}.html`,
        type: "article",
        extra: `<script type="application/ld+json">${videoSchemaJson(lang, v)}</script>`,
      }, videoPageBody(lang, v))
    );
  }

  write(
    `${lang}/videos/intro-aoglang.html`,
    page(lang, 3, "videos", "videos/intro-aoglang.html", {
      title: isZh ? "认识 aoglang — 视频" : "Intro to aoglang — Video",
      desc: isZh ? "HTML5 视频播放与嵌入示例。" : "HTML5 video playback and embed demo.",
      canonical: `${SITE}/${lang}/videos/intro-aoglang.html`,
      extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"VideoObject","name":"${isZh ? "认识 aoglang" : "Intro to aoglang"}","uploadDate":"2026-05-27"}</script>`,
    }, isZh
      ? `    <ol class="breadcrumb"><li><a href="../">首页</a></li><li><a href="./">视频</a></li><li aria-current="page">认识 aoglang</li></ol>
    <header class="article-header"><h1>认识 aoglang</h1><p class="card-meta"><a href="${crossLangHref("en", "videos/intro-aoglang.html", 3)}" hreflang="en">English</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="${relPrefix(3)}assets/img/video-poster.svg">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        您的浏览器不支持视频播放。
      </video>
      <p>MDN 示例视频。本站自托管短片请见<a href="./">视频列表</a>。</p>
    </article>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Videos</a></li><li aria-current="page">Intro</li></ol>
    <header class="article-header"><h1>Intro to aoglang</h1><p class="card-meta"><a href="${crossLangHref("zh", "videos/intro-aoglang.html", 3)}" hreflang="zh">中文版</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="${relPrefix(3)}assets/img/video-poster.svg">
        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        Your browser does not support video.
      </video>
      <p>MDN sample clip. See <a href="./">video list</a> for self-hosted MP4s on this site.</p>
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
${[...ARTICLES]
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((a) => rssItem(a.zh.title, `${SITE}/zh/articles/${a.slug}.html`, a.zh.desc, a.rssDate))
  .join("\n")}
${VIDEOS.map((v) => rssItem(v.zh.title, `${SITE}/zh/videos/${v.slug}.html`, v.zh.desc, "Tue, 27 May 2026 00:00:00 GMT")).join("\n")}
</channel>
</rss>`);

write("en/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>aoglang Articles</title>
  <link>${SITE}/en/</link>
  <description>Latest articles</description>
  <language>en</language>
${[...ARTICLES]
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((a) => rssItem(a.en.title, `${SITE}/en/articles/${a.slug}.html`, a.en.desc, a.rssDate))
  .join("\n")}
${VIDEOS.map((v) => rssItem(v.en.title, `${SITE}/en/videos/${v.slug}.html`, v.en.desc, "Tue, 27 May 2026 00:00:00 GMT")).join("\n")}
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

function writeSearchIndex() {
  const items = [
    ...ARTICLES.map((a) => ({
      lang: "zh",
      title: a.zh.title,
      desc: a.zh.desc,
      url: `articles/${a.slug}.html`,
      tags: a.zh.tags,
    })),
    ...PICTURES.map((p) => ({
      lang: "zh",
      title: p.zh.title,
      desc: p.zh.desc,
      url: `gallery/${p.slug}.html`,
      tags: p.zh.keywords,
    })),
    {
      lang: "zh",
      title: "无穷符号 3D 视觉合辑",
      desc: "十张无穷符号 3D 抽象视觉合集页面，亦可从单张作品页浏览。",
      url: "gallery/infinity-3d.html",
      tags: ["图集", "无穷符号", "3D", "合辑", "aoglang"],
    },
    {
      lang: "zh",
      title: "春日图集",
      desc: "示例图集：多图展示与无障碍说明。",
      url: "gallery/spring-scenes.html",
      tags: ["图集", "摄影"],
    },
    ...VIDEOS.map((v) => ({
      lang: "zh",
      title: v.zh.title,
      desc: v.zh.desc,
      url: `videos/${v.slug}.html`,
      tags: v.zh.tags,
    })),
    {
      lang: "zh",
      title: "认识 aoglang 视频（示例）",
      desc: "HTML5 视频播放与嵌入说明。",
      url: "videos/intro-aoglang.html",
      tags: ["视频", "示例"],
    },
    {
      lang: "zh",
      title: "关于我们",
      desc: "站点使命与联系方式。",
      url: "about/",
      tags: ["关于"],
    },
    {
      lang: "zh",
      title: "联系我们",
      desc: "邮件与留言表单。",
      url: "contact/",
      tags: ["联系"],
    },
    ...ARTICLES.map((a) => ({
      lang: "en",
      title: a.en.title,
      desc: a.en.desc,
      url: `articles/${a.slug}.html`,
      tags: a.en.tags,
    })),
    ...PICTURES.map((p) => ({
      lang: "en",
      title: p.en.title,
      desc: p.en.desc,
      url: `gallery/${p.slug}.html`,
      tags: p.en.keywords,
    })),
    {
      lang: "en",
      title: "Infinity 3D visual collection",
      desc: "Collection page for ten infinity-themed 3D visuals; each also has its own URL.",
      url: "gallery/infinity-3d.html",
      tags: ["gallery", "infinity", "3D", "collection", "aoglang"],
    },
    {
      lang: "en",
      title: "Spring scenes gallery",
      desc: "Sample photo gallery with captions and alt text.",
      url: "gallery/spring-scenes.html",
      tags: ["gallery", "photos"],
    },
    ...VIDEOS.map((v) => ({
      lang: "en",
      title: v.en.title,
      desc: v.en.desc,
      url: `videos/${v.slug}.html`,
      tags: v.en.tags,
    })),
    {
      lang: "en",
      title: "Intro to aoglang (video demo)",
      desc: "HTML5 video playback and embed demo.",
      url: "videos/intro-aoglang.html",
      tags: ["video", "demo"],
    },
    {
      lang: "en",
      title: "About",
      desc: "Mission and contact information.",
      url: "about/",
      tags: ["about"],
    },
    {
      lang: "en",
      title: "Contact",
      desc: "Email and contact form.",
      url: "contact/",
      tags: ["contact"],
    },
  ];
  write("assets/data/search-index.json", `${JSON.stringify({ items }, null, 2)}\n`);
}

writeAllArticles();
writeHomePages();
writeSearchIndex();

// Sitemap
const urls = [
  "/", "/zh/", "/en/",
  "/zh/articles/", "/en/articles/",
  ...ARTICLES.flatMap((a) => [`/zh/articles/${a.slug}.html`, `/en/articles/${a.slug}.html`]),
  "/zh/gallery/", "/en/gallery/",
  "/zh/gallery/spring-scenes.html", "/en/gallery/spring-scenes.html",
  ...PICTURES.flatMap((p) => [`/zh/gallery/${p.slug}.html`, `/en/gallery/${p.slug}.html`]),
  "/zh/gallery/infinity-3d.html", "/en/gallery/infinity-3d.html",
  "/zh/videos/", "/en/videos/",
  ...VIDEOS.flatMap((v) => [`/zh/videos/${v.slug}.html`, `/en/videos/${v.slug}.html`]),
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
