import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SITE = "https://aoglang.com";
const ADSENSE_CLIENT = "ca-pub-6958761551797888";
const GA_MEASUREMENT_ID = "G-1J6FDXQL1B";

/** 站点作者 / 编辑团队（E-E-A-T） */
const SITE_AUTHOR = {
  nameZh: "aoglang 编辑团队",
  nameEn: "aoglang editorial",
  email: "hello@aoglang.com",
};

/** 保留在 sitemap 中的航拍旗舰单图；其余单图页 noindex，由专题文章承载 SEO */
const INDEXABLE_PICTURE_SLUGS = new Set([
  "tokyo-waterside-highway",
  "tokyo-highway-bridge-01",
  "tokyo-highway-bridge-02",
  "fuzhou-stadium-aerial-01",
  "fuzhou-stadium-aerial-02",
  "haikou-shipyard-aerial",
  "wind-turbines-drone-01",
  "wind-turbines-drone-02",
]);

/** 首页「精选专题」文章 slug */
const HOME_FEATURED = [
  "aoglang-site-seo-case-study",
  "tokyo-aerial-complete-guide",
  "fuzhou-energy-aerial-series",
  "business-portrait-visual-handbook",
  "infinity-3d-complete-guide",
  "video-shorts-collection-guide",
];

/** 视频栏目深度解读文章 */
const VIDEO_FEATURE_SLUG = "video-shorts-collection-guide";

function gtagScript() {
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_MEASUREMENT_ID}');
</script>`;
}

function adsenseScript() {
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;
}

/** 页脚友情链接（外链加 rel="noopener noreferrer"） */
const FRIEND_LINKS = [
  {
    url: "https://aogl.cn",
    label: "aogl.cn",
    titleZh: "Aogl 官网",
    titleEn: "Aogl official site",
  },
];

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
  <meta name="twitter:card" content="summary_large_image">${meta.noindex ? '\n  <meta name="robots" content="noindex, follow">' : ""}
  <link rel="stylesheet" href="${assets}/css/main.css">
  ${gtagScript()}
  ${adsenseScript()}
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

function footerFriends(lang) {
  if (!FRIEND_LINKS.length) return "";
  const label = lang === "zh" ? "友情链接" : "Links";
  const links = FRIEND_LINKS.map((l) => {
    const title = lang === "zh" ? l.titleZh : l.titleEn;
    return `<a href="${l.url}" rel="noopener noreferrer" target="_blank" title="${title}">${l.label}</a>`;
  }).join(" · ");
  return `
      <div class="footer-friends">
        <p><span class="footer-friends-label">${label}</span> ${links}</p>
      </div>`;
}

function footer(lang, depth) {
  const base = langBase(depth);
  const friends = footerFriends(lang);
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
      </div>${friends}
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
      </div>${friends}
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
  {
    slug: "aerial-boat-turquoise-coast",
    file: "video-04.mp4",
    uploadFile: "1470038889.mp4",
    poster: "video-04-poster.jpg",
    w: 1280,
    h: 720,
    durationIso: "PT22S",
    durationZh: "约 22 秒",
    durationEn: "~22 sec",
    date: "2026-06-03",
    rssDate: "Wed, 03 Jun 2026 00:00:00 GMT",
    zh: {
      title: "碧蓝海岸航拍小船",
      desc: "1280×720 俯拍短片：碧色海面、崖影与小船航迹，适合旅行、自然与航拍类内容推荐位。",
      tags: ["视频", "航拍", "海岸", "小船", "碧蓝海水", "旅行", "自托管"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 <strong>俯拍海岸小船</strong>短片（约 22 秒，1280×720）。画面一侧为深色崖壁投影，一侧为透亮碧色海面，小船划开白色航迹，适合旅行栏目、目的地宣传与社媒竖裁素材源。",
        },
        {
          h: "观看与引用",
          p: "支持 HTML5 内联播放。转载或嵌入时请链接本页，并保留 <code>poster</code> 封面以利于搜索摘要展示。",
        },
        {
          h: "技术信息",
          p: "源文件 <code>1470038889.mp4</code>，构建时同步至 <code>assets/media/video/video-04.mp4</code>。可与 <a href=\"../articles/drone-aerial-city-photography.html\">无人机航拍指南</a> 文章互链。",
        },
      ],
    },
    en: {
      title: "Aerial boat on turquoise coast",
      desc: "1280×720 top-down clip: teal water, cliff shadow, and a small boat trail—ideal for travel and nature video slots.",
      tags: ["video", "aerial", "coast", "boat", "turquoise water", "travel", "self-hosted"],
      sections: [
        {
          h: "Overview",
          p: "A <strong>top-down coastal boat</strong> clip (~22 seconds, 1280×720) with dramatic cliff shadow and vivid teal water—great for travel reels and destination pages.",
        },
        {
          h: "Watch & cite",
          p: "Plays inline with HTML5 controls. Link to this page when embedding; keep the <code>poster</code> for rich search snippets.",
        },
        {
          h: "Technical notes",
          p: "Synced from <code>1470038889.mp4</code> to <code>assets/media/video/video-04.mp4</code>. Pair with our <a href=\"../articles/drone-aerial-city-photography.html\">drone aerial guide</a>.",
        },
      ],
    },
  },
  {
    slug: "underwater-surfer-wave",
    file: "video-05.mp4",
    uploadFile: "yard_middle.mp4",
    poster: "video-05-poster.jpg",
    w: 1920,
    h: 1080,
    durationIso: "PT5S",
    durationZh: "约 5 秒",
    durationEn: "~5 sec",
    date: "2026-06-03",
    rssDate: "Wed, 03 Jun 2026 00:00:00 GMT",
    zh: {
      title: "水下冲浪破浪瞬间",
      desc: "1920×1080 水下视角短片：冲浪者与浪沫气泡，适合运动、海洋与极限体育视觉。",
      tags: ["视频", "冲浪", "水下", "海浪", "运动", "海洋", "自托管"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 <strong>水下冲浪视角</strong>短片（约 5 秒，1920×1080）。镜头从浪底仰拍破浪白沫与冲浪者身影，气泡与碧色海水交织，适合运动品牌、海洋主题与动感片头。",
        },
        {
          h: "适用场景",
          p: "可用于体育资讯、冲浪教学预告、旅游海岛宣传，或与 <a href=\"../gallery/abstract-water-ripples.html\">水纹抽象图</a> 组成「水」主题内容簇。",
        },
        {
          h: "SEO 说明",
          p: "本页含 VideoObject 结构化数据、双语标题与封面图，便于视频类搜索结果展示。",
        },
      ],
    },
    en: {
      title: "Underwater surfer in the wave",
      desc: "1920×1080 underwater clip: surfer, foam, and bubbles—built for sports, ocean, and action visuals.",
      tags: ["video", "surfing", "underwater", "wave", "sports", "ocean", "self-hosted"],
      sections: [
        {
          h: "Overview",
          p: "An <strong>underwater surfing</strong> shot (~5 seconds, 1920×1080) looking up through foam and teal water—ideal for sports brands and ocean campaigns.",
        },
        {
          h: "Where to use it",
          p: "Pair with our <a href=\"../gallery/abstract-water-ripples.html\">water ripple abstract</a> for a cohesive “water” content cluster on articles and galleries.",
        },
        {
          h: "SEO",
          p: "VideoObject schema, bilingual copy, and a poster image help video-rich results and accessibility.",
        },
      ],
    },
  },
  {
    slug: "blue-butterfly-closeup",
    file: "video-06.mp4",
    uploadFile: "Title of the document.mp4",
    poster: "video-06-poster.jpg",
    w: 1920,
    h: 1080,
    durationIso: "PT6S",
    durationZh: "约 6 秒",
    durationEn: "~6 sec",
    date: "2026-06-03",
    rssDate: "Wed, 03 Jun 2026 00:00:00 GMT",
    zh: {
      title: "蓝蝶特写·好奇凝视",
      desc: "1920×1080 电影感特写：蓝黑蝶翼与孩童好奇凝视，适合自然、亲子与慢镜头栏目。",
      tags: ["视频", "蝴蝶", "自然", "特写", "电影感", "亲子", "自托管"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 <strong>蓝蝶室内特写</strong>短片（约 6 秒，1920×1080）。浅景深突出蝶翼纹理与人物侧脸，氛围安静柔和，适合自然教育、亲子内容与情绪向品牌短片。",
        },
        {
          h: "观看说明",
          p: "建议配合耳机在较暗环境下观看以感受画面层次。引用请注明 <strong>aoglang</strong> 并链接本页。",
        },
        {
          h: "技术信息",
          p: "源文件 <code>Title of the document.mp4</code>，输出为 <code>video-06.mp4</code>，构建时自动生成封面 <code>video-06-poster.jpg</code>。",
        },
      ],
    },
    en: {
      title: "Blue butterfly close-up",
      desc: "1920×1080 cinematic macro: blue-black wings and a curious gaze—ideal for nature and family storytelling.",
      tags: ["video", "butterfly", "nature", "close-up", "cinematic", "family", "self-hosted"],
      sections: [
        {
          h: "Overview",
          p: "A <strong>blue butterfly macro</strong> (~6 seconds, 1920×1080) with shallow depth of field—quiet, intimate, and great for nature or family campaigns.",
        },
        {
          h: "How to watch",
          p: "Best on a larger screen with sound if your cut includes ambience. Credit <strong>aoglang</strong> and link here when republishing.",
        },
        {
          h: "Technical notes",
          p: "Source <code>Title of the document.mp4</code> → <code>video-06.mp4</code>; poster generated at build time.",
        },
      ],
    },
  },
  {
    slug: "global-network-globe",
    file: "video-07.mp4",
    uploadFile: "world-home-flat.mp4",
    poster: "video-07-poster.jpg",
    w: 594,
    h: 594,
    durationIso: "PT13S",
    durationZh: "约 13 秒",
    durationEn: "~13 sec",
    date: "2026-06-03",
    rssDate: "Wed, 03 Jun 2026 00:00:00 GMT",
    zh: {
      title: "全球网络地球动画",
      desc: "594×594 方形循环动画：紫色线框地球与节点光点，适合科技、互联与数据可视化场景。",
      tags: ["视频", "地球", "网络", "科技", "数据", "动画", "自托管"],
      sections: [
        {
          h: "视频简介",
          p: "本条为 <strong>线框地球网络动画</strong>（约 13 秒，594×594 方形）。紫色网格覆盖美洲轮廓，节点光点强调连接感，适合 SaaS、通信与全球化主题头图。",
        },
        {
          h: "搭配建议",
          p: "可与 <a href=\"../gallery/world-map-blue-light.html\">世界地图蓝光轮廓</a>、<a href=\"../gallery/binary-blue-light-rays.html\">二进制蓝光背景</a> 组成科技视觉专题。",
        },
        {
          h: "发布流程",
          p: "将 MP4 放入 <code>upload/video/</code> 后运行 <code>npm run build</code> 即可同步媒体、生成封面与双语 SEO 页面。",
        },
      ],
    },
    en: {
      title: "Global network globe animation",
      desc: "594×594 square loop: purple wireframe Earth with node lights—built for tech, connectivity, and data stories.",
      tags: ["video", "globe", "network", "tech", "data", "animation", "self-hosted"],
      sections: [
        {
          h: "Overview",
          p: "A <strong>wireframe globe loop</strong> (~13 seconds, 594×594) with purple mesh and glowing nodes—ideal for SaaS heroes and connectivity themes.",
        },
        {
          h: "Pair with galleries",
          p: "Link to <a href=\"../gallery/world-map-blue-light.html\">world map blue light</a> and <a href=\"../gallery/binary-blue-light-rays.html\">binary blue rays</a> for a tech visual series.",
        },
        {
          h: "Publishing",
          p: "Drop MP4s into <code>upload/video/</code> and run <code>npm run build</code> to sync files, posters, and bilingual SEO pages.",
        },
      ],
    },
  },
];

/** 单图页是否编入 sitemap（薄页 noindex，由专题文章承载） */
function pictureIsIndexable(p) {
  if (p.slug.startsWith("wqd-")) return false;
  return INDEXABLE_PICTURE_SLUGS.has(p.slug);
}

/** 单图页对应的深度专题文章 */
function pictureTopicArticleSlug(p) {
  const slug = p.slug;
  if (slug.startsWith("tokyo-")) return "tokyo-aerial-complete-guide";
  if (/fuzhou|wind-turbines|haikou-shipyard/.test(slug)) return "fuzhou-energy-aerial-series";
  if (slug.startsWith("wqd-")) return "infinity-3d-complete-guide";
  if (
    /customer-service|living-room|phone-call|contact-us|middle-aged|computer-technician|binary-blue|world-map|ai-high-tech|ethereal-hands|young-woman|hand-|protective-suit|desk-headphones|iphone|laptop-news|newspaper|urban-snapshot|senior-outdoor/.test(
      slug
    )
  ) {
    return "business-portrait-visual-handbook";
  }
  if (/wafer|electric-grid|earth-from-space|abstract-water|hikers-mountain|protective-suit|desk-headphones|newspaper|iphone-screen|laptop-news|urban-snapshot/.test(slug)) {
    return "tech-industry-visual-handbook";
  }
  return null;
}

function articleAuthorFooter(lang, date) {
  const isZh = lang === "zh";
  const name = isZh ? SITE_AUTHOR.nameZh : SITE_AUTHOR.nameEn;
  return `      <footer class="article-byline">
        <p>${isZh ? "作者" : "By"} <strong>${name}</strong> · ${isZh ? "发布于" : "Published"} ${date} · <a href="mailto:${SITE_AUTHOR.email}">${SITE_AUTHOR.email}</a></p>
        <p>${isZh ? "转载请注明出处并链接原文。" : "Please link to the original when republishing."}</p>
      </footer>`;
}

function aboutPageBody(lang) {
  const isZh = lang === "zh";
  if (isZh) {
    return `    <h1>关于 aoglang</h1>
    <article class="prose">
      <p><strong>aoglang</strong> 是一个中英文双语内容站，专注分享<strong>航拍视觉、3D 抽象艺术、人物商务场景</strong>以及<strong>静态网站内容运营</strong>方面的原创文章、图集与自托管短视频。我们由独立创作者与编辑团队维护，所有页面均为纯 HTML 静态文件，无数据库，加载快速，对搜索引擎与访问者友好。</p>
      <h2>我们做什么</h2>
      <p>与单纯堆叠图片素材不同，aoglang 以<strong>深度专题文章</strong>为核心：每篇围绕一个真实主题（如东京城市航拍、福州能源基建、人物商务视觉）展开，结合图集与视频，提供可操作的拍摄思路、使用场景与 SEO 实践经验。图集栏目提供高清视觉作品；视频栏目提供自托管 MP4 短片及优化说明。</p>
      <h2>内容标准</h2>
      <ul>
        <li>每篇专题文章由编辑团队撰写或审核，力求原创、具体、对读者有用</li>
        <li>图片与视频附带清晰标题、描述与 alt 文本，尊重无障碍访问</li>
        <li>不发布误导性标题、关键词堆砌或批量复制的薄内容</li>
        <li>转载需注明 <strong>aoglang</strong> 并链接原文；商业使用请邮件咨询</li>
      </ul>
      <h2>与 aogl.cn 的关系</h2>
      <p><a href="https://aogl.cn" rel="noopener noreferrer" target="_blank">aogl.cn</a> 为关联品牌站点。aoglang.com 独立运营，内容侧重视觉创作分享与静态站实践，与 aogl.cn 在定位与栏目上有所区分。</p>
      <h2>联系我们</h2>
      <p>内容合作、纠错或授权咨询：<a href="mailto:${SITE_AUTHOR.email}">${SITE_AUTHOR.email}</a>，或通过<a href="../contact/">联系表单</a>留言。</p>
      <p>推荐从<a href="../articles/aoglang-site-seo-case-study.html">站点 SEO 复盘</a>、<a href="../articles/tokyo-aerial-complete-guide.html">东京航拍完全指南</a>、<a href="../articles/infinity-3d-complete-guide.html">无穷符号 3D 完全指南</a>、<a href="../articles/video-shorts-collection-guide.html">自托管短片合集解读</a>或<a href="../articles/business-portrait-visual-handbook.html">人物商务视觉手册</a>开始阅读。</p>
    </article>`;
  }
  return `    <h1>About aoglang</h1>
    <article class="prose">
      <p><strong>aoglang</strong> is a bilingual (Chinese &amp; English) site for <strong>aerial photography</strong>, <strong>3D abstract art</strong>, <strong>people &amp; business visuals</strong>, and <strong>static-site publishing</strong>. We publish in-depth articles, photo galleries, and self-hosted short videos as pure HTML—no database, fast to load, and accessible to readers and search engines.</p>
      <h2>What we publish</h2>
      <p>Unlike a stock-image dump, aoglang is built around <strong>long-form features</strong>: each article explores a real theme (Tokyo city aerials, Fuzhou energy infrastructure, business portraits) with galleries and clips, practical shooting notes, use cases, and SEO lessons learned on this stack.</p>
      <h2>Editorial standards</h2>
      <ul>
        <li>Features are written or reviewed by our editorial team—original, specific, and useful</li>
        <li>Images and videos include clear titles, descriptions, and alt text</li>
        <li>No misleading headlines, keyword stuffing, or mass-produced thin pages</li>
        <li>Credit <strong>aoglang</strong> with a link when republishing; email us for commercial licensing</li>
      </ul>
      <h2>Relationship to aogl.cn</h2>
      <p><a href="https://aogl.cn" rel="noopener noreferrer" target="_blank">aogl.cn</a> is a related brand site. aoglang.com runs independently with a focus on visual storytelling and static-site practice.</p>
      <h2>Contact</h2>
      <p>Partnerships, corrections, or licensing: <a href="mailto:${SITE_AUTHOR.email}">${SITE_AUTHOR.email}</a> or the <a href="../contact/">contact form</a>.</p>
      <p>Start with our <a href="../articles/aoglang-site-seo-case-study.html">SEO case study</a>, <a href="../articles/tokyo-aerial-complete-guide.html">Tokyo aerial guide</a>, <a href="../articles/infinity-3d-complete-guide.html">Infinity 3D guide</a>, <a href="../articles/video-shorts-collection-guide.html">Video collection feature</a>, or <a href="../articles/business-portrait-visual-handbook.html">Business portrait handbook</a>.</p>
    </article>`;
}

function homeFeaturedSection(lang) {
  const isZh = lang === "zh";
  const cards = HOME_FEATURED.map((slug) => articleHomeCard(lang, articleBySlug(slug))).join("\n      ");
  return `    <section class="home-featured" id="featured">
      <h2 class="section-title">${isZh ? "精选专题" : "Featured guides"}</h2>
      <p class="section-intro">${isZh ? "深度原创文章，配合图集与视频，建议从这里开始阅读。" : "In-depth features paired with galleries and videos—start here."}</p>
      <div class="masonry-grid home-featured-grid">
      ${cards}
      </div>
    </section>`;
}

/** 文章数据：构建时生成 zh/en 页面、列表、首页与搜索索引 */
const ARTICLES = [
  {
    slug: "aoglang-site-seo-case-study",
    date: "2026-06-16",
    rssDate: "Tue, 16 Jun 2026 00:00:00 GMT",
    thumb: null,
    zh: {
      title: "aoglang 站点 SEO 复盘：从薄内容到专题化静态站",
      desc: "真实复盘 aoglang.com 的 SEO 改造：专题文章、noindex 薄页、sitemap 精简、Search Console 与 AdSense 准备清单。",
      tags: ["文章", "SEO", "复盘", "静态站", "AdSense", "Search Console", "案例"],
      intro:
        "aoglang 是一个<strong>纯 HTML 双语静态站</strong>，曾面临 Google AdSense「低价值内容」拒审。2026 年 6 月我们进行了一轮系统性 SEO 改造：以<strong>深度专题</strong>替代批量薄页、精简 sitemap、强化 E-E-A-T。本文记录改造前后策略、技术实现与<strong>Google Search Console 操作步骤</strong>，供同类站点参考。",
      sections: [
        {
          h: "改造前的问题诊断",
          p: "拒审原因可归纳为：① 50+ 张结构相同的单图页（每张仅 100 字模板文案）；② 深度文章不足 10 篇且偏短；③ 关于页过于简略，缺乏作者/编辑信息；④ 站点在短时间内大量上新，呈现「程序化 SEO」特征。技术 SEO（sitemap、hreflang、canonical）虽已就绪，但<strong>内容价值</strong>未达标。",
        },
        {
          h: "核心策略：专题优先 + 薄页 noindex",
          p: "我们在 <code>tools/build.mjs</code> 中引入 <code>INDEXABLE_PICTURE_SLUGS</code>：仅 8 张航拍旗舰单图保留索引，其余单图页输出 <code>&lt;meta name=\"robots\" content=\"noindex, follow\"&gt;</code>，搜索权重集中于 <a href=\"tokyo-aerial-complete-guide.html\">东京航拍完全指南</a>、<a href=\"business-portrait-visual-handbook.html\">人物商务手册</a> 等 15+ 篇专题。sitemap 从 280+ URL 精简至<strong>文章 + 合辑 + 旗舰图</strong>。",
        },
        {
          h: "E-E-A-T 与信任页",
          p: "扩充<a href=\"../about/\">关于我们</a>（站点定位、内容标准、与 aogl.cn 关系）；更新<a href=\"../privacy/\">隐私政策</a>（Analytics、AdSense Cookie 说明）；文章底部自动添加<strong>作者署名</strong>与 BlogPosting schema。联系表单指向真实邮箱 hello@aoglang.com。",
        },
        {
          h: "技术 SEO 清单（已实现）",
          p: "双语独立 URL + <code>hreflang</code>；根目录 <code>robots.txt</code> 指向 <code>sitemap.xml</code>；每页 <code>canonical</code>、Open Graph、JSON-LD（WebSite、BlogPosting、ImageObject、VideoObject）；RSS（<code>zh/feed.xml</code>）；站内搜索索引（<code>assets/data/search-index.json</code>）；<code>ads.txt</code> 置于根目录。",
        },
        {
          h: "Google Search Console 配置步骤",
          p: "① 访问 <a href=\"https://search.google.com/search-console\" rel=\"noopener noreferrer\" target=\"_blank\">Google Search Console</a>，添加资源「网址前缀」<code>https://aoglang.com</code>；② 用 DNS TXT 或 HTML 文件验证所有权；③ 左侧「站点地图」→ 输入 <code>sitemap.xml</code> → 提交；④ 使用「网址检查」测试首页与 2–3 篇专题是否「可编入索引」；⑤ 每周查看「网页编制索引」与「体验」→ Core Web Vitals。",
        },
        {
          h: "部署后通知搜索引擎",
          p: "每次重大更新并部署后，在项目根目录执行：<code>npm run ping-sitemap</code>（向 Google ping sitemap，见 <code>tools/ping-sitemap.mjs</code>）。Bing 需在其 Webmaster Tools 手动提交。",
        },
        {
          h: "Bing Webmaster 与其他渠道",
          p: "同步注册 <a href=\"https://www.bing.com/webmasters\" rel=\"noopener noreferrer\" target=\"_blank\">Bing Webmaster Tools</a> 并提交同一 sitemap。可在 GitHub README、RSS 阅读器、摄影社区分享<strong>专题文章链接</strong>（而非单图薄页），获取自然外链。",
        },
        {
          h: "内容持续更新建议",
          p: "AdSense 复审前建议：深度专题 ≥ 15 篇（已完成）；每周 1 篇 1200 字以上新文；2–3 个月自然搜索展示逐步上升；避免恢复批量单图 SEO 页。内容矩阵：航拍（<a href=\"tokyo-aerial-complete-guide.html\">东京</a>、<a href=\"fuzhou-energy-aerial-series.html\">福州/风电</a>）、3D（<a href=\"infinity-3d-complete-guide.html\">无穷符号</a>）、视频（<a href=\"video-shorts-collection-guide.html\">短片合集</a>）、工业（<a href=\"tech-industry-visual-handbook.html\">科技工业</a>）。",
        },
        {
          h: "AdSense 复审 checklist",
          p: "□ ads.txt 已授权 □ 关于/联系/隐私完整 □ 深度原创内容充足 □ 薄页已 noindex □ Search Console 无大量抓取错误 □ 改造后持续更新 2–3 个月 □ 勾选「已解决低价值内容」后再申请。",
        },
        {
          h: "相关技术文档",
          p: "构建流程：<a href=\"static-site-guide.html\">静态网站搭建指南</a>。图片性能：<a href=\"webp-gallery-performance.html\">WebP 优化</a>。视频 SEO：<a href=\"self-hosted-video-seo.html\">自托管 MP4 实践</a>。仓库 README 含完整部署与 GSC 说明。",
        },
      ],
    },
    en: {
      title: "aoglang SEO case study: from thin pages to feature-first static HTML",
      desc: "How aoglang.com pivoted from thin gallery URLs to long-form features, noindex rules, a lean sitemap, and Search Console setup for AdSense readiness.",
      tags: ["article", "SEO", "case study", "static site", "AdSense", "Search Console"],
      intro:
        "aoglang is a bilingual static HTML site that faced AdSense <strong>low-value content</strong> rejection. In June 2026 we rebuilt the content strategy around <strong>long-form features</strong>, noindex thin gallery URLs, and stronger trust pages. This case study documents the before/after and <strong>Google Search Console</strong> steps.",
      sections: [
        {
          h: "What was wrong",
          p: "50+ identical single-image templates, fewer than ten short articles, a thin About page, and a burst of new URLs that looked like programmatic SEO—despite solid technical SEO basics.",
        },
        {
          h: "Feature-first + noindex",
          p: "Only eight flagship aerial URLs stay indexable; other gallery pages emit <code>noindex, follow</code>. Weight moves to features like the <a href=\"tokyo-aerial-complete-guide.html\">Tokyo aerial guide</a> and <a href=\"business-portrait-visual-handbook.html\">portrait handbook</a>. Sitemap shrank dramatically.",
        },
        {
          h: "E-E-A-T & trust",
          p: "Expanded <a href=\"../about/\">About</a>, <a href=\"../privacy/\">Privacy</a> (Analytics/AdSense cookies), author bylines, and Organization schema.",
        },
        {
          h: "Technical SEO already in place",
          p: "hreflang, canonical, OG tags, JSON-LD, RSS, search JSON, root <code>ads.txt</code>, and <code>robots.txt</code> → <code>sitemap.xml</code>.",
        },
        {
          h: "Google Search Console",
          p: "Add property <code>https://aoglang.com</code>, verify, submit <code>sitemap.xml</code>, URL-inspect key features weekly, monitor indexing and Core Web Vitals.",
        },
        {
          h: "Ping after deploy",
          p: "Run <code>npm run ping-sitemap</code> after major deploys (<code>tools/ping-sitemap.mjs</code>). Submit separately in Bing Webmaster Tools.",
        },
        {
          h: "Bing & distribution",
          p: "Submit the same sitemap to Bing Webmaster Tools; share feature URLs (not thin gallery pages) for natural links.",
        },
        {
          h: "Ongoing content",
          p: "15+ features done; aim for one 1200+ word post per week and 2–3 months of updates before AdSense re-review.",
        },
        {
          h: "AdSense checklist",
          p: "Authorized ads.txt, trust pages, substantive content, noindex thin URLs, clean Search Console, sustained updates—then request review.",
        },
        {
          h: "Related docs",
          p: "<a href=\"static-site-guide.html\">Static site guide</a> · <a href=\"webp-gallery-performance.html\">WebP performance</a> · <a href=\"self-hosted-video-seo.html\">Video SEO</a> · README for deploy/GSC.",
        },
      ],
    },
  },
  {
    slug: "tech-industry-visual-handbook",
    date: "2026-06-15",
    rssDate: "Mon, 15 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/wafer-chip-inspection-01-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "晶圆芯片检测特写",
      altEn: "Wafer chip inspection close-up",
    },
    zh: {
      title: "科技与工业视觉手册：半导体、能源与办公场景",
      desc: "晶圆检测、电网光效、地球太空视角与办公资讯场景——如何为 B2B 与科技媒体选对图、写对说明，附 aoglang 作品索引。",
      tags: ["文章", "科技", "工业", "半导体", "能源", "B2B", "手册"],
      intro:
        "科技类内容配图不只是「蓝色背景 + 电路板」。<strong>半导体制造、能源基建、太空视角与办公资讯</strong>各有视觉语言。本手册整合 aoglang 图库中相关作品，帮助编辑、运营与设计者按行业场景快速选型，并避免「一张图到处用」的同质化问题。",
      sections: [
        {
          h: "半导体与先进制造",
          p: "晶圆与芯片检测题材强调<strong>精度、洁净与微观尺度</strong>。本站 <a href=\"../gallery/wafer-chip-inspection-01.html\">晶圆检测 01</a> 至 <a href=\"../gallery/wafer-chip-inspection-04.html\">04</a> 提供不同角度特写，适合半导体行业报道、设备厂商白皮书与招聘页。文案应点明「制造/检测/洁净室」而非空泛「高科技」。",
        },
        {
          h: "能源与电网视觉",
          p: "<a href=\"../gallery/electric-grid-energy-lines.html\">电网能量流光</a> 与 <a href=\"../gallery/earth-from-space.html\">地球太空视角</a> 常用于能源政策、电力交易与 ESG 报告。与航拍风电系列（见 <a href=\"fuzhou-energy-aerial-series.html\">福州与海上风电专题</a>）组合，可覆盖「宏观—微观—基建」三层叙事。",
        },
        {
          h: "办公、资讯与数字设备",
          p: "<a href=\"../gallery/laptop-news-desk.html\">笔记本新闻桌面</a>、<a href=\"../gallery/newspaper-top-view.html\">报纸俯拍</a>、<a href=\"../gallery/iphone-screen-closeup.html\">iPhone 屏幕特写</a> 适合媒体、财经与 SaaS 资讯类内容。注意与<a href=\"business-portrait-visual-handbook.html\">人物商务手册</a>中的客服/通话题材区分：本组偏「信息消费」而非「人际沟通」。",
        },
        {
          h: "防护、户外与生活方式交叉",
          p: "<a href=\"../gallery/protective-suit-portrait-01.html\">防护服人物</a> 系列面向医疗、工业安全与科普；<a href=\"../gallery/hikers-mountain-summit.html\">登山者山顶</a>、<a href=\"../gallery/senior-outdoor-relax.html\">户外休憩</a> 则适合健康、养老与运动品牌——在 B2B 站点中可作为「人文侧」平衡过于冰冷的科技画面。",
        },
        {
          h: "抽象背景的使用边界",
          p: "<a href=\"../gallery/abstract-water-ripples.html\">抽象水纹</a> 等低语义图像适合章节过渡与 PPT，但<strong>不宜作为整站主视觉</strong>。科技文章应以本手册中的「有场景」图片为主，抽象背景为辅。",
        },
        {
          h: "alt 与 meta 写作示例",
          p: "示例 alt：「洁净室环境下晶圆芯片显微镜检测特写，适合半导体制造主题」。避免：「科技、芯片、高清、背景」。meta description 写清<strong>行业 + 场景 + 用途</strong>，50–120 字为宜。",
        },
        {
          h: "与 3D、视频栏目联动",
          p: "静态工业图可与 <a href=\"infinity-3d-complete-guide.html\">3D 无穷符号视觉</a>、<a href=\"../videos/global-network-globe.html\">全球网络地球动画</a> 组合用于发布会 Keynote。动效负责「吸睛」，静态图负责「信息密度」。",
        },
        {
          h: "作品索引",
          p: "半导体：<a href=\"../gallery/wafer-chip-inspection-01.html\">01</a>–<a href=\"../gallery/wafer-chip-inspection-04.html\">04</a>。能源：<a href=\"../gallery/electric-grid-energy-lines.html\">电网</a> · <a href=\"../gallery/earth-from-space.html\">地球</a>。办公：<a href=\"../gallery/laptop-news-desk.html\">笔记本桌面</a> · <a href=\"../gallery/desk-headphones-work.html\">耳机办公</a>。",
        },
      ],
    },
    en: {
      title: "Tech & industry visual handbook: chips, energy & office scenes",
      desc: "Wafer inspection, power-grid art, Earth from space, and news-desk scenes—how to pick B2B visuals with an indexed tour of the aoglang gallery.",
      tags: ["article", "tech", "industry", "semiconductor", "energy", "B2B", "handbook"],
      intro:
        "Tech storytelling needs more than blue circuit backgrounds. This handbook maps <strong>semiconductor, energy, space, and desk/news</strong> imagery in our gallery to real B2B use cases.",
      sections: [
        {
          h: "Semiconductor & advanced manufacturing",
          p: "Wafer and inspection close-ups stress precision and cleanrooms—see <a href=\"../gallery/wafer-chip-inspection-01.html\">wafer inspection 01</a> through <a href=\"../gallery/wafer-chip-inspection-04.html\">04</a> for fab reports and recruiting pages.",
        },
        {
          h: "Energy & grid visuals",
          p: "<a href=\"../gallery/electric-grid-energy-lines.html\">Electric grid lines</a> and <a href=\"../gallery/earth-from-space.html\">Earth from space</a> pair with aerial wind features in <a href=\"fuzhou-energy-aerial-series.html\">Fuzhou &amp; offshore wind</a> for macro-to-infrastructure narratives.",
        },
        {
          h: "Office, news & devices",
          p: "<a href=\"../gallery/laptop-news-desk.html\">Laptop news desk</a>, <a href=\"../gallery/newspaper-top-view.html\">newspaper top view</a>, and <a href=\"../gallery/iphone-screen-closeup.html\">iPhone screen close-up</a> suit media and SaaS stories—distinct from people-focused support shots in the <a href=\"business-portrait-visual-handbook.html\">portrait handbook</a>.",
        },
        {
          h: "Safety, outdoor & lifestyle crossovers",
          p: "<a href=\"../gallery/protective-suit-portrait-01.html\">Protective suit portraits</a>, <a href=\"../gallery/hikers-mountain-summit.html\">hikers on a summit</a>, and <a href=\"../gallery/senior-outdoor-relax.html\">senior relaxing outdoors</a> humanize otherwise cold tech pages.",
        },
        {
          h: "Abstract backgrounds—use sparingly",
          p: "<a href=\"../gallery/abstract-water-ripples.html\">Abstract water ripples</a> work for transitions, not as the only visual language of a site.",
        },
        {
          h: "Alt & meta examples",
          p: "Good alt: “Wafer chip inspection under microscope in a cleanroom, for semiconductor manufacturing stories.” Skip keyword lists.",
        },
        {
          h: "Mix with 3D & video",
          p: "Pair stills with <a href=\"infinity-3d-complete-guide.html\">Infinity 3D art</a> and the <a href=\"../videos/global-network-globe.html\">network globe clip</a> for keynotes.",
        },
        {
          h: "Index",
          p: "Chips: <a href=\"../gallery/wafer-chip-inspection-01.html\">01</a>–<a href=\"../gallery/wafer-chip-inspection-04.html\">04</a>. Energy: <a href=\"../gallery/electric-grid-energy-lines.html\">grid</a> · <a href=\"../gallery/earth-from-space.html\">Earth</a>.",
        },
      ],
    },
  },
  {
    slug: "video-shorts-collection-guide",
    date: "2026-06-14",
    rssDate: "Sun, 14 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/video/video-04-poster.jpg",
      w: 1280,
      h: 720,
      altZh: "碧蓝海岸航拍小船",
      altEn: "Aerial boat on turquoise coast",
    },
    zh: {
      title: "自托管短片合集解读：旅行、自然、宏观与科技动画",
      desc: "逐支解读 aoglang 8 支 MP4 短片：题材分组、时长与码率建议、poster 与 VideoObject SEO，以及每支视频的适用场景。",
      tags: ["文章", "视频", "自托管", "MP4", "合集", "SEO", "专题"],
      intro:
        "短视频平台很方便，但<strong>自托管 MP4</strong> 让你完全掌控加载速度、页面 SEO 与品牌呈现。aoglang 视频栏目现有 <strong>8 支自托管短片</strong>（约 5–22 秒），每支均有独立双语页面。本文是完整导读：按题材分组、说明技术实现，并给出运营与搜索优化建议。",
      sections: [
        {
          h: "栏目概览：为什么做自托管短片页",
          p: "每支视频对应唯一 URL、<code>h1</code>、封面 poster、时长说明与 VideoObject JSON-LD——详见 <a href=\"self-hosted-video-seo.html\">自托管视频 SEO 实践</a>。相比仅嵌入第三方 iframe，静态页 + MP4 更利于<strong>长尾检索</strong>（如「碧蓝海岸航拍短片」「蓝蝶特写视频」）与站内主题集群。",
        },
        {
          h: "旅行与自然类",
          p: "<a href=\"../videos/aerial-boat-turquoise-coast.html\">碧蓝海岸航拍小船</a>（约 22 秒）俯拍海面与崖影，适合旅行、地理类内容；<a href=\"../videos/underwater-surfer-wave.html\">水下冲浪瞬间</a>（约 5 秒）强调运动张力。可与 <a href=\"tokyo-aerial-complete-guide.html\">东京航拍指南</a>、<a href=\"../gallery/tokyo-waterside-highway.html\">滨水高速图集</a> 互链，形成「空中—水面—水下」视觉线。",
        },
        {
          h: "情绪特写与微距",
          p: "<a href=\"../videos/blue-butterfly-closeup.html\">蓝蝶特写</a>（约 6 秒）电影感微距，适合自然、环保与情绪向品牌；<a href=\"../videos/warm-visual-clip.html\">暖色视觉短片</a>（约 14 秒）强调色温与氛围，可用作 mood board 或页面背景循环（需控制自动播放与无障碍）。",
        },
        {
          h: "科技动画与抽象动效",
          p: "<a href=\"../videos/global-network-globe.html\">全球网络地球</a>（约 13 秒）线框地球循环，搭配 <a href=\"../gallery/world-map-blue-light.html\">世界地图光效</a> 静帧；<a href=\"../videos/tech-visual-short.html\">科技视觉短片</a>、<a href=\"../videos/hd-motion-visual.html\">高清动感视觉</a> 适合 SaaS、通信与发布会预告。",
        },
        {
          h: "压缩、体积与 CDN 建议",
          p: "5–15 秒短片建议码率控制在<strong>2–5 Mbps</strong>（1080p）或更低分辨率换体积。首屏务必设置 poster，避免白屏。超过 20 MB 的文件考虑 CDN 或降低分辨率；构建脚本将 upload 同步至 <code>assets/media/video/</code>，详见 <a href=\"new-video-uploads-collection.html\">视频上新解读</a>。",
        },
        {
          h: "无障碍与用户体验",
          p: "使用 <code>controls</code> 与 <code>playsinline</code>；不默认有声自动播放。提供文字说明（本页 sections）满足「看不懂画面也能理解内容」。为听障用户提供摘要段落，为视障用户确保 poster 的 alt 在周围文案中体现。",
        },
        {
          h: "发布新视频的流程",
          p: "1) 将 MP4 放入 <code>upload/video/</code>；2) 在 <code>VIDEOS</code> 数组登记 slug、poster、双语文案；3) <code>npm run build</code>；4) 更新本篇或 <a href=\"new-video-uploads-collection.html\">上新文章</a>；5) 在相关图集/航拍专题中添加内链。",
        },
        {
          h: "全部视频链接",
          p: "<a href=\"../videos/aerial-boat-turquoise-coast.html\">海岸航拍</a> · <a href=\"../videos/underwater-surfer-wave.html\">水下冲浪</a> · <a href=\"../videos/blue-butterfly-closeup.html\">蓝蝶</a> · <a href=\"../videos/global-network-globe.html\">地球网络</a> · <a href=\"../videos/warm-visual-clip.html\">暖色</a> · <a href=\"../videos/tech-visual-short.html\">科技</a> · <a href=\"../videos/hd-motion-visual.html\">高清动感</a> · <a href=\"../videos/\">列表页</a>。",
        },
      ],
    },
    en: {
      title: "Self-hosted shorts collection: travel, nature, macro & tech motion",
      desc: "All eight aoglang MP4 clips explained—grouping, compression, posters, VideoObject SEO, and where each clip fits editorially.",
      tags: ["article", "video", "self-hosted", "MP4", "collection", "SEO", "feature"],
      intro:
        "Self-hosted MP4s give you speed, SEO, and branding control. aoglang hosts <strong>eight bilingual clip pages</strong> (~5–22 sec each). This feature groups them by theme with technical and publishing notes.",
      sections: [
        {
          h: "Why dedicated clip pages",
          p: "Unique URLs, posters, duration text, and VideoObject schema—see <a href=\"self-hosted-video-seo.html\">self-hosted video SEO</a>. Better for long-tail queries than iframe-only embeds.",
        },
        {
          h: "Travel & nature",
          p: "<a href=\"../videos/aerial-boat-turquoise-coast.html\">Aerial boat on teal coast</a> (~22 sec) and <a href=\"../videos/underwater-surfer-wave.html\">underwater surf</a> (~5 sec). Cross-link <a href=\"tokyo-aerial-complete-guide.html\">Tokyo aerial guide</a> for air-to-water storytelling.",
        },
        {
          h: "Macro & mood",
          p: "<a href=\"../videos/blue-butterfly-closeup.html\">Blue butterfly macro</a> and <a href=\"../videos/warm-visual-clip.html\">warm visual clip</a> (~14 sec) for nature and brand mood boards.",
        },
        {
          h: "Tech motion",
          p: "<a href=\"../videos/global-network-globe.html\">Network globe</a> with <a href=\"../gallery/world-map-blue-light.html\">world map still</a>; plus <a href=\"../videos/tech-visual-short.html\">tech visual short</a> and <a href=\"../videos/hd-motion-visual.html\">HD motion visual</a>.",
        },
        {
          h: "Compression & CDN",
          p: "Target ~2–5 Mbps for 1080p shorts under 15 sec; always ship a poster image. See <a href=\"new-video-uploads-collection.html\">new uploads notes</a> for the build pipeline.",
        },
        {
          h: "Accessibility",
          p: "Use controls and playsinline; no loud autoplay. Surround players with descriptive prose for users who cannot see the footage.",
        },
        {
          h: "Adding a new clip",
          p: "Drop MP4 in <code>upload/video/</code>, register in <code>VIDEOS</code>, run <code>npm run build</code>, then update this feature or the uploads article.",
        },
        {
          h: "All clips",
          p: "<a href=\"../videos/aerial-boat-turquoise-coast.html\">Coast</a> · <a href=\"../videos/underwater-surfer-wave.html\">Surf</a> · <a href=\"../videos/blue-butterfly-closeup.html\">Butterfly</a> · <a href=\"../videos/global-network-globe.html\">Globe</a> · <a href=\"../videos/\">index</a>.",
        },
      ],
    },
  },
  {
    slug: "infinity-3d-complete-guide",
    date: "2026-06-13",
    rssDate: "Sat, 13 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/wqd/wqd-05-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "双色光影无穷环 3D 视觉",
      altEn: "Dual-lit chrome infinity 3D",
    },
    zh: {
      title: "无穷符号 3D 视觉完全指南：十件作品与品牌应用",
      desc: "逐件解读铜色金属、螺旋缎带、双色镀铬与虹彩玻璃等 10 款 3D 无穷符号作品，含发布会、Keynote 与网站头图应用建议。",
      tags: ["文章", "3D", "无穷符号", "品牌", "抽象", "合辑", "指南"],
      intro:
        "无穷符号（∞）象征连续、迭代与无限可能，是科技品牌常用的<strong>抽象视觉母题</strong>。aoglang <a href=\"../gallery/infinity-3d.html\">无穷符号 3D 合辑</a> 收录 10 件不同材质与光感的 3D 作品。本文逐件解读创作意图与适用场景，帮助设计者与运营在 Keynote、官网与社媒中<strong>选对款式、写对文案</strong>。",
      sections: [
        {
          h: "合辑页与单件作品的关系",
          p: "合辑页展示系列全貌；单件页面（如 <a href=\"../gallery/wqd-05.html\">双色光影无穷环</a>）便于分享与下载引用。单件 URL 已设 <code>noindex</code>，搜索权重集中在本篇与 <a href=\"../gallery/infinity-3d.html\">合辑页</a>——避免 10 个薄页稀释站点质量。",
        },
        {
          h: "01 铜色金属 · 02 橙金螺旋 · 03 波浪层叠",
          p: "<a href=\"../gallery/wqd-01.html\">铜色金属无穷环</a>：暖色、稳重，适合金融科技与「传承/持续」叙事。<a href=\"../gallery/wqd-02.html\">橙金螺旋缎带</a> 与 <a href=\"../gallery/wqd-03.html\">橙色波浪层叠</a> 强调<strong>动感与能量</strong>，适合创新发布、创业活动背景。",
        },
        {
          h: "04 渐变背景螺旋",
          p: "<a href=\"../gallery/wqd-04.html\">渐变背景螺旋</a> 用暖黄到浅蓝的背景衬托主体，适合需要「留白」的封面与横幅——主体可左侧放置标题文字。",
        },
        {
          h: "05 双色光影 · 06 青绿莫比乌斯",
          p: "<a href=\"../gallery/wqd-05.html\">双色光影无穷环</a> 是系列中最「赛博」的一款，冷蓝 + 暖金对撞，适合 AI、云计算主题。<a href=\"../gallery/wqd-06.html\">青绿渐变扭曲环</a> 的莫比乌斯结构适合数据、循环与可持续发展故事。",
        },
        {
          h: "07 哑光橙 · 08 单色橙铜 · 09 层叠橙带",
          p: "三件<strong>橙色系极简</strong>款式（<a href=\"../gallery/wqd-07.html\">07</a>、<a href=\"../gallery/wqd-08.html\">08</a>、<a href=\"../gallery/wqd-09.html\">09</a>）适合 App 图标、按钮周边与品牌规范展示——干扰少、识别度高。",
        },
        {
          h: "10 虹彩玻璃方块",
          p: "<a href=\"../gallery/wqd-10.html\">虹彩玻璃方块无穷</a> 轻盈、未来，适合元宇宙、新材料与创意产业。与<a href=\"../videos/hd-motion-visual.html\">高清动感短片</a> 搭配可制作 10–15 秒 loop 预告。",
        },
        {
          h: "品牌应用 checklist",
          p: "① 确认主色与品牌色板是否冲突；② 亮底用 07/08，暗底用 05/10；③ 发布会主屏用 02/05，文档内页用 01/07；④ 每件写独立说明，勿十张共用一句 caption。",
        },
        {
          h: "与 AI 光效、商务视觉的组合",
          p: "3D 无穷系列偏「符号与材质」；<a href=\"../gallery/ai-high-tech-lights.html\">AI 高科技光效</a> 偏「氛围与背景」。企业官网可 3D 无穷作 Hero，AI 光效作章节分隔。人物场景见 <a href=\"business-portrait-visual-handbook.html\">商务视觉手册</a>。",
        },
        {
          h: "全部作品链接",
          p: "<a href=\"../gallery/infinity-3d.html\">合辑页</a> · <a href=\"../gallery/wqd-01.html\">01</a>–<a href=\"../gallery/wqd-10.html\">10</a> · 延伸阅读 <a href=\"infinity-3d-brand-visuals.html\">品牌抽象 SEO 笔记</a>。",
        },
      ],
    },
    en: {
      title: "Infinity 3D complete guide: ten renders & brand use cases",
      desc: "All ten infinity-themed 3D pieces explained—materials, lighting, and where each fits keynotes, heroes, and social posts.",
      tags: ["article", "3D", "infinity", "branding", "abstract", "collection", "guide"],
      intro:
        "The infinity motif signals continuity and iteration—a staple of tech branding. Our <a href=\"../gallery/infinity-3d.html\">Infinity 3D collection</a> includes ten distinct renders. This guide walks each piece and when to use it.",
      sections: [
        {
          h: "Collection vs single URLs",
          p: "The collection page carries SEO weight; individual URLs (e.g. <a href=\"../gallery/wqd-05.html\">dual-lit chrome</a>) are for sharing and are <code>noindex</code> to avoid thin-page spam.",
        },
        {
          h: "01 copper · 02 spiral · 03 waves",
          p: "<a href=\"../gallery/wqd-01.html\">Copper metallic</a> for fintech gravitas; <a href=\"../gallery/wqd-02.html\">orange-gold spiral</a> and <a href=\"../gallery/wqd-03.html\">layered waves</a> for launch energy.",
        },
        {
          h: "04 gradient spiral",
          p: "<a href=\"../gallery/wqd-04.html\">Spiral on gradient sky</a> leaves room for headline copy on campaigns.",
        },
        {
          h: "05 dual-lit · 06 teal Möbius",
          p: "<a href=\"../gallery/wqd-05.html\">Dual-lit chrome</a> for AI/cloud stories; <a href=\"../gallery/wqd-06.html\">teal Möbius twist</a> for loops and sustainability narratives.",
        },
        {
          h: "07–09 minimal orange family",
          p: "Matte and layered orange icons (<a href=\"../gallery/wqd-07.html\">07</a>–<a href=\"../gallery/wqd-09.html\">09</a>) for app branding and UI marketing.",
        },
        {
          h: "10 iridescent glass",
          p: "<a href=\"../gallery/wqd-10.html\">Iridescent glass blocks</a> for creative tech and metaverse themes—pair with the <a href=\"../videos/hd-motion-visual.html\">HD motion clip</a>.",
        },
        {
          h: "Brand checklist",
          p: "Match brand palette; dark slides → 05/10; docs → 01/07; unique caption per render.",
        },
        {
          h: "Mix with AI lights & portraits",
          p: "Combine with <a href=\"../gallery/ai-high-tech-lights.html\">AI light stills</a> and the <a href=\"business-portrait-visual-handbook.html\">portrait handbook</a> for full-site art direction.",
        },
        {
          h: "Links",
          p: "<a href=\"../gallery/infinity-3d.html\">Collection</a> · <a href=\"../gallery/wqd-01.html\">01</a>–<a href=\"../gallery/wqd-10.html\">10</a> · Also <a href=\"infinity-3d-brand-visuals.html\">brand SEO notes</a>.",
        },
      ],
    },
  },
  {
    slug: "tokyo-aerial-complete-guide",
    date: "2026-06-12",
    rssDate: "Fri, 12 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/tokyo-waterside-highway-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "东京滨水高速航拍",
      altEn: "Tokyo waterside highway aerial",
    },
    zh: {
      title: "东京城市航拍完全指南：机位、构图与作品解读",
      desc: "从滨水高速到桥面视角，系统解读 aoglang 东京航拍系列：选点思路、黄金时段、安全合规与后期方向，附全部相关作品链接。",
      tags: ["文章", "航拍", "东京", "无人机", "城市", "专题", "指南"],
      intro:
        "东京是东亚最具辨识度的城市航拍题材之一：密集的高架、湾岸线与天际线在同一张画面里形成层次。本文是 aoglang <strong>东京航拍专题</strong>的完整导读，整合本站全部东京相关作品，并分享我们在选点、构图与发布上的实践经验——无论你是摄影爱好者还是内容运营者，都能从中找到可复用的方法。",
      sections: [
        {
          h: "为什么东京滨水高速是「必拍机位」",
          p: "东京湾岸区域的高架公路在黄昏与蓝调时刻尤其上镜：路面车流形成引导线，远处高楼提供尺度感，水面反射增加画面呼吸感。本站代表作 <a href=\"../gallery/tokyo-waterside-highway.html\">东京滨水高速航拍</a> 采用略高的俯拍角度，让公路曲线贯穿画面，适合作为城市旅行、交通基建类内容的头图或封面。",
        },
        {
          h: "同一主题的多机位：桥面系列",
          p: "单张图片很难讲完整条故事。我们在 <a href=\"../gallery/tokyo-highway-bridge-01.html\">高速桥面 01</a> 与 <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a> 中尝试了更接近桥面的平视与侧向构图：01 强调车辆与护栏的细节，02 拉远展示桥梁与背景建筑的层次。发布时建议用一篇文章串联，并在图集列表中标注「东京系列」，帮助读者与搜索引擎理解内容簇。",
        },
        {
          h: "拍摄时段与光线选择",
          p: "城市航拍最常用三个时段：<strong>日出后 30 分钟</strong>（柔和侧光、路面反光）、<strong>日落前 1 小时</strong>（暖调、长阴影）、<strong>蓝调时刻</strong>（城市灯光初上、天空仍有余色）。东京高架在蓝调时刻对比度最高，但需注意 wind 与能见度。若只能白天拍摄，选择多云天气可避免硬阴影，画面更均匀。",
        },
        {
          h: "构图要点：引导线、层次与留白",
          p: "高架题材天然具备引导线——让公路从画面一角进入、向对角延伸，视觉焦点会更稳定。层次方面：前景（路面/护栏）— 中景（车流）— 远景（天际线）三层结构最常用。留白不要贪多：东京画面信息密度高，适当裁切边缘杂乱的建筑，比展示「更多信息」更有效。",
        },
        {
          h: "合规与安全（必读）",
          p: "日本对无人机飞行有严格限制：人口密集区、机场周边、夜间飞行等均有规定。实际操作前务必查阅 <strong>国土交通省无人机规则</strong>，使用官方地图确认禁飞区，并在必要时申请许可。切勿为「出片」冒险违规——这不仅涉及法律，也关乎行业声誉。本文仅讨论创作与发布，不构成法律建议。",
        },
        {
          h: "后期处理建议",
          p: "城市航拍后期宜「克制」：轻微提升对比与清晰度即可，避免过度饱和使画面失真。若用于网页，导出 WebP 并控制宽度在 1400px 左右（本站构建脚本会自动生成），列表页使用缩略图——详见 <a href=\"webp-gallery-performance.html\">WebP 图集优化指南</a>。",
        },
        {
          h: "如何为单张图写有价值的说明页",
          p: "不要十张图共用同一段文案。每张图写清<strong>地点 + 视角 + 时段 + 用途</strong>，例如「东京滨水高速黄昏俯拍，适合交通与旅行类封面」。单图页可保留为作品详情，但 SEO 重心应放在本篇等专题文章上——我们已对非旗舰单图页设置 noindex，避免薄内容稀释站点质量。",
        },
        {
          h: "相关阅读与作品",
          p: "国内城市航拍可对照 <a href=\"fuzhou-energy-aerial-series.html\">福州与海上风电航拍专题</a>；通用技巧见 <a href=\"drone-aerial-city-photography.html\">无人机城市航拍指南</a>。全部东京作品：<a href=\"../gallery/tokyo-waterside-highway.html\">滨水高速</a> · <a href=\"../gallery/tokyo-highway-bridge-01.html\">桥面 01</a> · <a href=\"../gallery/tokyo-highway-bridge-02.html\">桥面 02</a>。",
        },
      ],
    },
    en: {
      title: "Tokyo city aerials: locations, composition & gallery walkthrough",
      desc: "A complete guide to aoglang’s Tokyo drone series—waterfront expressway, bridge angles, golden hour, compliance, and links to every related photo.",
      tags: ["article", "aerial", "Tokyo", "drone", "urban", "guide", "feature"],
      intro:
        "Tokyo is one of the most recognizable urban aerial subjects in East Asia: stacked highways, bayfront lines, and skylines in a single frame. This feature walks through our <strong>Tokyo aerial collection</strong> with location notes, composition tips, and publishing lessons—whether you fly drones or curate visual content.",
      sections: [
        {
          h: "Why the waterfront expressway is a signature shot",
          p: "Tokyo’s bayfront highways shine at dusk and blue hour: traffic lines lead the eye, towers add scale, water adds reflection. Our hero frame <a href=\"../gallery/tokyo-waterside-highway.html\">Tokyo waterside highway</a> uses a slightly elevated angle so the road curve spans the frame—ideal for travel and infrastructure stories.",
        },
        {
          h: "Multiple angles: the bridge pair",
          p: "One image rarely tells the full story. <a href=\"../gallery/tokyo-highway-bridge-01.html\">Highway bridge 01</a> and <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a> move closer to deck level: 01 emphasizes vehicles and guardrails; 02 pulls back for bridge-to-skyline layers. Tie them together in an article and label the set “Tokyo series” in indexes.",
        },
        {
          h: "Best times of day",
          p: "Three windows dominate urban aerials: <strong>30 minutes after sunrise</strong> (soft side light), <strong>the hour before sunset</strong> (warm tones), and <strong>blue hour</strong> (city lights plus sky color). Tokyo highways pop at blue hour—watch wind and visibility. Overcast midday softens harsh shadows when that is your only option.",
        },
        {
          h: "Composition: leading lines, layers, breathing room",
          p: "Let the highway enter from a corner and travel diagonally. Classic layering: foreground (road/rail) — midground (traffic) — background (skyline). Tokyo frames are dense; crop clutter at the edges rather than showing everything.",
        },
        {
          h: "Compliance and safety",
          p: "Japan restricts drones over dense areas, near airports, at night, and more. Check MLIT rules and official maps before flying; obtain permits when required. This article is creative guidance, not legal advice—never risk unsafe or illegal flights for a shot.",
        },
        {
          h: "Post-processing and web delivery",
          p: "Keep edits restrained: modest contrast and clarity beat neon saturation. For the web, export WebP around 1400px wide (our build script handles thumbs and heroes)—see <a href=\"webp-gallery-performance.html\">WebP gallery performance</a>.",
        },
        {
          h: "Writing useful captions per image",
          p: "Avoid one caption for every file. State <strong>place + angle + time + use case</strong> per photo. Detail URLs can remain for sharing; SEO weight sits on features like this one—we noindex thin single-image pages that are not flagship aerials.",
        },
        {
          h: "Related reading",
          p: "Compare with <a href=\"fuzhou-energy-aerial-series.html\">Fuzhou &amp; offshore wind</a> and <a href=\"drone-aerial-city-photography.html\">drone city aerial tips</a>. Tokyo gallery: <a href=\"../gallery/tokyo-waterside-highway.html\">waterside highway</a> · <a href=\"../gallery/tokyo-highway-bridge-01.html\">bridge 01</a> · <a href=\"../gallery/tokyo-highway-bridge-02.html\">bridge 02</a>.",
        },
      ],
    },
  },
  {
    slug: "fuzhou-energy-aerial-series",
    date: "2026-06-11",
    rssDate: "Thu, 11 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/fuzhou-stadium-aerial-01-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "福州体育场航拍",
      altEn: "Fuzhou stadium aerial",
    },
    zh: {
      title: "福州与海上风电航拍专题：地标、能源与工业视觉",
      desc: "解读福州体育场、海口船厂与海上风电无人机作品：题材选择、行业应用场景、组图发布策略与 aoglang 实拍经验。",
      tags: ["文章", "航拍", "福州", "风电", "能源", "工业", "专题"],
      intro:
        "城市航拍不止有「网红天际线」。<strong>体育地标、港口工业与新能源</strong>同样是高价值题材——企业宣传、行业媒体、政策解读类内容都需要这类视觉。本文整合 aoglang 在<strong>福州、海口与海上风电</strong>方向的全部航拍作品，说明我们如何选题、拍什么、以及这些画面适合哪些传播场景。",
      sections: [
        {
          h: "福州体育场：地标建筑的航拍表达",
          p: "大型体育场馆具备清晰的几何轮廓，适合从正上方或 45° 俯拍展示结构与周边城市关系。本站 <a href=\"../gallery/fuzhou-stadium-aerial-01.html\">福州体育场航拍 01</a> 突出椭圆屋顶与看台层次；<a href=\"../gallery/fuzhou-stadium-aerial-02.html\">02</a> 拉远纳入更多城市背景，适合「城市 + 地标」类报道。发布时建议在标题中写清城市名与建筑类型，便于本地搜索。",
        },
        {
          h: "海口船厂：工业港口的视觉叙事",
          p: "<a href=\"../gallery/haikou-shipyard-aerial.html\">海口船厂航拍</a> 展示港口 crane、泊位与船体的工业尺度。这类画面常用于航运、制造、区域经济类稿件。工业题材要注意画面整洁度：裁切杂乱前景，保留 1–2 个清晰主体（如 crane 与船体），比「信息过载」的全景更易传播。",
        },
        {
          h: "海上风电：新能源行业的「标配视觉」",
          p: "风电场航拍是能源报道的高频需求。<a href=\"../gallery/wind-turbines-drone-01.html\">海上风电 01</a> 以阵列排布展示规模感；<a href=\"../gallery/wind-turbines-drone-02.html\">02</a> 拉近单机细节，适合技术解读或 ESG 报告配图。拍摄时注意海上风力与电池管理，并遵守当地空域规定。",
        },
        {
          h: "行业应用场景对照表",
          p: "<strong>体育传媒</strong> → 福州体育场系列；<strong>航运/制造</strong> → 海口船厂；<strong>能源/ESG/政策</strong> → 风电系列；<strong>城市综合</strong> → 可混排福州 02 与风电远景。在文章或 PPT 中使用时，配一句「场景说明」比单放图片更专业。",
        },
        {
          h: "组图发布与内链策略",
          p: "同一城市的不同机位应在专题文章中互链，并在图集首页按主题分组展示。避免为每张图单独做 SEO 落地页——我们已将非旗舰单图设为 noindex，由本篇等专题承载搜索意图。新作品入库后，优先<strong>更新专题段落</strong>，而非再增加薄页。",
        },
        {
          h: "技术参数与交付建议",
          p: "网页展示用 WebP 1400px 宽即可；印刷或大屏需保留 upload 原图。列表卡片使用 480px 缩略图，可显著降低首页流量——流程见 <a href=\"webp-gallery-performance.html\">WebP 优化指南</a>。",
        },
        {
          h: "与东京系列的对比学习",
          p: "东京系列侧重「城市交通线」；本专题侧重「地标 + 工业 + 能源」。两者可对照阅读 <a href=\"tokyo-aerial-complete-guide.html\">东京航拍完全指南</a>，理解不同题材下的构图与文案差异。",
        },
        {
          h: "全部相关作品链接",
          p: "<a href=\"../gallery/fuzhou-stadium-aerial-01.html\">福州体育场 01</a> · <a href=\"../gallery/fuzhou-stadium-aerial-02.html\">02</a> · <a href=\"../gallery/haikou-shipyard-aerial.html\">海口船厂</a> · <a href=\"../gallery/wind-turbines-drone-01.html\">海上风电 01</a> · <a href=\"../gallery/wind-turbines-drone-02.html\">02</a>。更多航拍方法论：<a href=\"drone-aerial-city-photography.html\">无人机城市航拍指南</a>。",
        },
      ],
    },
    en: {
      title: "Fuzhou & offshore wind aerials: landmarks, energy & industry",
      desc: "Stadium, shipyard, and offshore wind turbine drone work—use cases, publishing strategy, and links to every related photo in the aoglang gallery.",
      tags: ["article", "aerial", "Fuzhou", "wind energy", "industry", "feature"],
      intro:
        "Urban aerials are more than skyline postcards. <strong>Stadiums, ports, and renewables</strong> power corporate stories, trade press, and policy content. This feature gathers our <strong>Fuzhou, Haikou, and offshore wind</strong> work with shooting notes and where each frame fits.",
      sections: [
        {
          h: "Fuzhou stadium: landmark geometry",
          p: "<a href=\"../gallery/fuzhou-stadium-aerial-01.html\">Fuzhou stadium 01</a> highlights the roof ellipse and seating bowl; <a href=\"../gallery/fuzhou-stadium-aerial-02.html\">02</a> widens to include city context. Put the city name and building type in titles for local discovery.",
        },
        {
          h: "Haikou shipyard: industrial port narrative",
          p: "<a href=\"../gallery/haikou-shipyard-aerial.html\">Haikou shipyard</a> shows cranes, berths, and hull scale—common in shipping and manufacturing coverage. Crop clutter; keep one or two clear subjects.",
        },
        {
          h: "Offshore wind: energy sector visuals",
          p: "<a href=\"../gallery/wind-turbines-drone-01.html\">Wind turbines 01</a> emphasizes array scale; <a href=\"../gallery/wind-turbines-drone-02.html\">02</a> closes in on a single unit for tech or ESG reports. Respect marine wind limits and airspace rules.",
        },
        {
          h: "Use-case map",
          p: "<strong>Sports media</strong> → Fuzhou stadium set. <strong>Shipping/mfg</strong> → Haikou shipyard. <strong>Energy/ESG</strong> → wind series. Add one sentence of context in articles or decks—not image-only slides.",
        },
        {
          h: "Publishing sets with internal links",
          p: "Link angles inside a feature like this one. We noindex thin single-image URLs that are not flagship aerials—update the feature when adding shots instead of spawning duplicate SEO pages.",
        },
        {
          h: "Delivery specs",
          p: "Web: 1400px WebP heroes and 480px thumbs (see <a href=\"webp-gallery-performance.html\">WebP performance</a>). Print/large format: keep upload originals.",
        },
        {
          h: "Compare with Tokyo",
          p: "Tokyo frames stress traffic lines; this set stresses landmarks and industry. Read <a href=\"tokyo-aerial-complete-guide.html\">Tokyo aerial guide</a> for a side-by-side study.",
        },
        {
          h: "Gallery links",
          p: "<a href=\"../gallery/fuzhou-stadium-aerial-01.html\">Stadium 01</a> · <a href=\"../gallery/fuzhou-stadium-aerial-02.html\">02</a> · <a href=\"../gallery/haikou-shipyard-aerial.html\">Haikou shipyard</a> · <a href=\"../gallery/wind-turbines-drone-01.html\">Wind 01</a> · <a href=\"../gallery/wind-turbines-drone-02.html\">02</a>.",
        },
      ],
    },
  },
  {
    slug: "business-portrait-visual-handbook",
    date: "2026-06-10",
    rssDate: "Wed, 10 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/customer-service-smile-01-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "微笑客服女性形象",
      altEn: "Smiling customer service portrait",
    },
    zh: {
      title: "人物与商务视觉创作手册：场景、受众与配图指南",
      desc: "系统解读客服、通话、居家、科技背景等人物商务题材：谁在用、怎么选图、如何写 alt 与专题文案，附 aoglang 全部相关作品索引。",
      tags: ["文章", "人物", "商务", "客服", "视觉", "手册", "专题"],
      intro:
        "人物与商务类视觉是网站、App、企业公众号的「刚需素材」——但大量站点只做图片堆叠，缺少<strong>场景说明与受众定位</strong>，容易被判为低价值内容。本手册基于 aoglang 图库中的人物、客服、通话与科技背景作品，整理一套<strong>可复用的选题与发布方法</strong>，帮助创作者与运营者选对图、写对字。",
      sections: [
        {
          h: "先定受众，再选画面",
          p: "同一张「打电话」的照片，运营商、社交 App、远程办公软件的语境完全不同。发布前用一句话回答：<strong>谁在看、解决什么问题</strong>。例如 <a href=\"../gallery/young-woman-phone-call.html\">年轻女性通话</a> 适合年轻化产品；<a href=\"../gallery/contact-us-mobile-call-01.html\">联系我们来电 01</a> 更偏 B2B 官网头图。",
        },
        {
          h: "客服与支持类视觉",
          p: "客服题材需要「可信赖 + 亲和」：<a href=\"../gallery/customer-service-smile-01.html\">微笑客服形象</a> 强调眼神与微笑，适合帮助中心、在线客服介绍页。文案避免空泛的「专业客服」，写清行业（电商、金融、SaaS）与情绪（耐心、高效）。",
        },
        {
          h: "居家与生活感场景",
          p: "<a href=\"../gallery/chinese-woman-living-room-01.html\">客厅坐姿 01</a> 与 <a href=\"../gallery/chinese-woman-living-room-02.html\">02</a> 营造非办公的亲切氛围，适合家居、教育、健康类内容。生活感的关键是「真实细节」——地面坐姿、自然光、不过度摆拍。",
        },
        {
          h: "商务肖像与 IT 办公",
          p: "<a href=\"../gallery/middle-aged-man-portrait-01.html\">中年男士肖像</a> 系列面向 B2B、咨询、制造管理层叙事；<a href=\"../gallery/computer-technician-office.html\">电脑技术员办公</a> 与 <a href=\"../gallery/computer-technician-office-02.html\">02</a> 适合 IT 服务、运维、网络安全主题。肖像类注意背景简洁，避免 identifiable 私人信息入镜。",
        },
        {
          h: "科技抽象背景：何时用、何时不用",
          p: "二进制蓝光、世界地图光效、AI 光效系列（如 <a href=\"../gallery/binary-blue-light-rays.html\">binary blue light</a>、<a href=\"../gallery/world-map-blue-light.html\">world map blue light</a>、<a href=\"../gallery/ai-high-tech-lights.html\">AI 光效主图</a>）适合发布会、白皮书、科技资讯——但不宜每篇文章都用同一背景，否则页面同质化。建议按<strong>季度主题</strong>轮换视觉风格。",
        },
        {
          h: "手势与细节特写",
          p: "<a href=\"../gallery/ethereal-hands-touch.html\">灵性能量手势</a>、<a href=\"../gallery/hand-energy-gesture.html\">指尖能量波纹</a> 等适合 wellness、创意产业；<a href=\"../gallery/hand-pink-nails-closeup.html\">美甲手部特写</a> 面向美容个护。特写镜头要在 alt 中写清主体与用途，而非只堆关键词。",
        },
        {
          h: "发布策略：专题优先，避免薄页泛滥",
          p: "我们为每类题材建立手册级专题（如本篇），单图页仅作作品详情与分享链接，大部分已设 <code>noindex</code> 以免稀释站点质量。新图入库后：① 更新本手册对应章节；② 在 <a href=\"people-business-portrait-gallery.html\">人物商务上新解读</a> 中Announce；③ 必要时写一篇行业应用案例。",
        },
        {
          h: "无障碍与 SEO 文案模板",
          p: "alt 模板：<em>[人物/场景] + [动作/情绪] + [适合的内容类型]</em>，例：「微笑女性客服，面向镜头，适合在线帮助中心配图」。meta description 50–120 字，写场景而非关键词列表。更多技术细节见 <a href=\"webp-gallery-performance.html\">WebP 图集优化</a>。",
        },
        {
          h: "作品索引（按主题）",
          p: "客服：<a href=\"../gallery/customer-service-smile-01.html\">客服微笑</a>。通话：<a href=\"../gallery/young-woman-phone-call.html\">年轻女性</a> · <a href=\"../gallery/contact-us-mobile-call-01.html\">联系我们 01</a> · <a href=\"../gallery/contact-us-mobile-call-02.html\">02</a>。居家：<a href=\"../gallery/chinese-woman-living-room-01.html\">客厅 01</a> · <a href=\"../gallery/chinese-woman-living-room-02.html\">02</a>。科技背景：<a href=\"../gallery/ai-high-tech-lights-02.html\">AI 光效 02</a> 起。",
        },
      ],
    },
    en: {
      title: "People & business visuals handbook: scenes, audiences & pick lists",
      desc: "How to choose support, phone, lifestyle, and tech-background imagery—with alt templates, publishing strategy, and an index of every related aoglang photo.",
      tags: ["article", "people", "business", "customer service", "handbook", "feature"],
      intro:
        "Portrait and business visuals power websites, apps, and corporate channels—but image dumps without <strong>scene context</strong> read as low-value. This handbook turns our customer-service, phone, lifestyle, and tech-background gallery into a repeatable workflow for picking and writing visuals.",
      sections: [
        {
          h: "Audience first, then the frame",
          p: "The same phone call photo serves different stories for carriers, social apps, or remote-work tools. Answer: <strong>who is watching and what problem does the image solve?</strong> Compare <a href=\"../gallery/young-woman-phone-call.html\">young woman on the phone</a> with <a href=\"../gallery/contact-us-mobile-call-01.html\">contact us call 01</a> for B2B headers.",
        },
        {
          h: "Customer support imagery",
          p: "<a href=\"../gallery/customer-service-smile-01.html\">Customer service smile</a> targets trust and warmth—help centers, support landing pages. Replace generic “professional agent” copy with industry and tone (patient, fast, ecommerce vs finance).",
        },
        {
          h: "Home and lifestyle scenes",
          p: "<a href=\"../gallery/chinese-woman-living-room-01.html\">Living room 01</a> and <a href=\"../gallery/chinese-woman-living-room-02.html\">02</a> feel casual—home, education, wellness niches. Authenticity beats obvious staging.",
        },
        {
          h: "Business portraits and IT office",
          p: "<a href=\"../gallery/middle-aged-man-portrait-01.html\">Middle-aged portraits</a> suit B2B narratives; <a href=\"../gallery/computer-technician-office.html\">technician at work</a> fits IT services and security topics. Keep backgrounds clean.",
        },
        {
          h: "Tech abstracts: when they help",
          p: "Binary blue light, world map glow, and AI light series (<a href=\"../gallery/binary-blue-light-rays.html\">example</a>, <a href=\"../gallery/world-map-blue-light.html\">map</a>, <a href=\"../gallery/ai-high-tech-lights.html\">AI lights</a>) work for launches and reports—rotate styles quarterly to avoid sameness.",
        },
        {
          h: "Gestures and detail shots",
          p: "See <a href=\"../gallery/ethereal-hands-touch.html\">ethereal hands</a> or <a href=\"../gallery/hand-pink-nails-closeup.html\">nail close-up</a> for wellness and beauty. Write alt text as subject + action + use case, not keyword lists.",
        },
        {
          h: "Publish features, not thin pages",
          p: "Handbook features carry SEO weight; most single-image URLs are <code>noindex</code>. When adding uploads: update this handbook, optionally announce in <a href=\"people-business-portrait-gallery.html\">people & business gallery notes</a>, and skip duplicate SEO landings.",
        },
        {
          h: "Alt and meta templates",
          p: "Alt pattern: <em>[subject/scene] + [action/mood] + [content type]</em>. Meta descriptions: 50–120 chars of scenario, not tag spam. See <a href=\"webp-gallery-performance.html\">WebP performance</a> for delivery.",
        },
        {
          h: "Themed index",
          p: "Support: <a href=\"../gallery/customer-service-smile-01.html\">smile</a>. Calls: <a href=\"../gallery/young-woman-phone-call.html\">young woman</a> · <a href=\"../gallery/contact-us-mobile-call-01.html\">contact 01</a>. Home: <a href=\"../gallery/chinese-woman-living-room-01.html\">living room 01</a>. Tech: <a href=\"../gallery/ai-high-tech-lights-02.html\">AI lights 02</a> onward.",
        },
      ],
    },
  },
  {
    slug: "new-video-uploads-collection",
    date: "2026-06-03",
    rssDate: "Wed, 03 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/video/video-04-poster.jpg",
      w: 1280,
      h: 720,
      altZh: "碧蓝海岸航拍小船封面",
      altEn: "Aerial boat on turquoise coast poster",
    },
    zh: {
      title: "视频栏目上新：海岸航拍、水下冲浪、蓝蝶与地球网络",
      desc: "解读 upload 新增 4 支自托管 MP4：俯拍碧色海岸、水下冲浪、蓝蝶特写与线框地球动画，每支均有双语页面与 VideoObject。",
      tags: ["文章", "视频", "航拍", "自然", "科技", "SEO", "自托管"],
      intro:
        "aoglang 视频栏目在原有暖色、高清与科技短片之外，新增 <strong>4 支题材各异的 MP4</strong>。下文按场景分组，并链到对应单支视频页面，便于读者浏览与搜索引擎理解内容簇。",
      sections: [
        {
          h: "旅行与自然",
          p: "俯拍碧色海面与崖影：<a href=\"../videos/aerial-boat-turquoise-coast.html\">碧蓝海岸航拍小船</a>（约 22 秒）；水下冲浪破浪：<a href=\"../videos/underwater-surfer-wave.html\">水下冲浪瞬间</a>（约 5 秒）。可与 <a href=\"drone-aerial-city-photography.html\">无人机航拍指南</a> 互链。",
        },
        {
          h: "情绪特写与科技动画",
          p: "电影感蓝蝶特写：<a href=\"../videos/blue-butterfly-closeup.html\">蓝蝶特写</a>；紫色线框地球循环：<a href=\"../videos/global-network-globe.html\">全球网络地球</a>，搭配 <a href=\"../gallery/world-map-blue-light.html\">世界地图光效</a> 图集。",
        },
        {
          h: "视频 SEO 要点",
          p: "每支视频应有独立 URL、<code>h1</code>、<code>meta description</code>、<code>poster</code> 封面与 VideoObject JSON-LD。详见 <a href=\"self-hosted-video-seo.html\">自托管视频 SEO</a>。",
        },
        {
          h: "发布方式",
          p: "将 MP4 放入 <code>upload/video/</code>，在 <code>tools/build.mjs</code> 的 <code>VIDEOS</code> 登记后执行 <code>npm run build</code>，即可同步至 <code>assets/media/video/</code> 并更新列表、RSS 与 sitemap。",
        },
      ],
    },
    en: {
      title: "New videos: coast aerial, surfing, butterfly & globe",
      desc: "Four new self-hosted MP4s with bilingual pages and VideoObject schema—coast drone, underwater surf, butterfly macro, and network globe.",
      tags: ["article", "video", "aerial", "nature", "tech", "SEO", "self-hosted"],
      intro:
        "Beyond our warm-tone, HD, and tech clips, aoglang adds <strong>four new MP4s</strong> with dedicated SEO pages. Grouped by theme below with internal links.",
      sections: [
        {
          h: "Travel & nature",
          p: "Top-down teal coast: <a href=\"../videos/aerial-boat-turquoise-coast.html\">aerial boat clip</a> (~22 sec). Underwater surf: <a href=\"../videos/underwater-surfer-wave.html\">surfer in the wave</a>. See also <a href=\"drone-aerial-city-photography.html\">drone aerial guide</a>.",
        },
        {
          h: "Macro & tech motion",
          p: "Cinematic butterfly: <a href=\"../videos/blue-butterfly-closeup.html\">blue butterfly close-up</a>. Wireframe globe: <a href=\"../videos/global-network-globe.html\">global network globe</a>—pair with <a href=\"../gallery/world-map-blue-light.html\">world map blue light</a>.",
        },
        {
          h: "Video SEO checklist",
          p: "Unique URL, <code>h1</code>, description, <code>poster</code>, and VideoObject JSON-LD per clip. Read <a href=\"self-hosted-video-seo.html\">self-hosted video SEO</a>.",
        },
        {
          h: "How we publish",
          p: "Drop files into <code>upload/video/</code>, register in <code>VIDEOS</code>, run <code>npm run build</code> to sync media and update indexes, RSS, and sitemap.",
        },
      ],
    },
  },
  {
    slug: "people-business-portrait-gallery",
    date: "2026-06-02",
    rssDate: "Mon, 02 Jun 2026 00:00:00 GMT",
    thumb: {
      src: "assets/img/gallery/pictures/customer-service-smile-01-thumb.webp",
      w: 1920,
      h: 1080,
      altZh: "微笑客服女性形象",
      altEn: "Smiling customer service portrait",
    },
    zh: {
      title: "人物与商务视觉上新：居家、客服、通话与科技背景",
      desc: "解读本次 upload 新增的人物与商务题材图：客厅坐姿、电话沟通、客服微笑、科技二进制光效与世界地图轮廓等，每张均有独立 SEO 页面。",
      tags: ["文章", "人物", "商务", "客服", "图集", "SEO", "肖像"],
      intro:
        "在原有航拍与工业特写之外，本站图集新增一批<strong>人物肖像与商务场景</strong>视觉，适合客服、电信、企业品牌与科技资讯类内容配图。下文按主题分组，并链到对应单图页面。",
      sections: [
        {
          h: "居家与电话沟通",
          p: "客厅地面坐姿营造亲切生活感，可参考 <a href=\"../gallery/chinese-woman-living-room-01.html\">客厅坐姿 01</a>、<a href=\"../gallery/chinese-woman-living-room-02.html\">02</a>；电话交谈画面见 <a href=\"../gallery/young-woman-phone-call.html\">年轻女性通话</a>，适合运营商、社交应用与远程沟通主题。",
        },
        {
          h: "客服、联系我们与商务肖像",
          p: "微笑客服形象见 <a href=\"../gallery/customer-service-smile-01.html\">客服微笑</a>；商务风来电场景：<a href=\"../gallery/contact-us-mobile-call-01.html\">联系我们来电 01</a>、<a href=\"../gallery/contact-us-mobile-call-02.html\">02</a>；成熟男性肖像：<a href=\"../gallery/middle-aged-man-portrait-01.html\">中年男士肖像 01</a>、<a href=\"../gallery/middle-aged-man-portrait-02.html\">02</a>；IT 办公可参考 <a href=\"../gallery/computer-technician-office.html\">电脑技术员办公</a>。",
        },
        {
          h: "科技抽象与手势创意",
          p: "二进制蓝光背景 <a href=\"../gallery/binary-blue-light-rays.html\">binary blue light rays</a>、世界地图光效 <a href=\"../gallery/world-map-blue-light.html\">world map blue light</a>、灵性能量手势 <a href=\"../gallery/ethereal-hands-touch.html\">ethereal hands touch</a>，以及 AI 光效系列 <a href=\"../gallery/ai-high-tech-lights-02.html\">AI 光效 02</a> 起，可与 <a href=\"../gallery/ai-high-tech-lights.html\">主图</a> 组成科技专题。",
        },
        {
          h: "发布与性能",
          p: "新图放入 <code>upload/picture/</code> 后执行 <code>npm run build</code> 即可生成 WebP 与双语页面。列表与首页使用缩略图，详见 <a href=\"webp-gallery-performance.html\">WebP 图集优化</a>。",
        },
      ],
    },
    en: {
      title: "New people & business portraits in the gallery",
      desc: "New uploads—living room scenes, phone calls, customer service smiles, tech backgrounds—with dedicated bilingual SEO pages.",
      tags: ["article", "people", "business", "customer service", "gallery", "SEO", "portrait"],
      intro:
        "Beyond aerials and industrial close-ups, the gallery adds <strong>portrait and business-scene</strong> visuals for telecom, support, and corporate storytelling.",
      sections: [
        {
          h: "Home and phone conversations",
          p: "Casual living-room poses: <a href=\"../gallery/chinese-woman-living-room-01.html\">living room 01</a>, <a href=\"../gallery/chinese-woman-living-room-02.html\">02</a>. Phone calls: <a href=\"../gallery/young-woman-phone-call.html\">young woman on the phone</a>.",
        },
        {
          h: "Support, contact us, and portraits",
          p: "Smiling support: <a href=\"../gallery/customer-service-smile-01.html\">customer service smile</a>. Business mobile calls: <a href=\"../gallery/contact-us-mobile-call-01.html\">contact us call 01</a>, <a href=\"../gallery/contact-us-mobile-call-02.html\">02</a>. Middle-aged portraits: <a href=\"../gallery/middle-aged-man-portrait-01.html\">portrait 01</a>, <a href=\"../gallery/middle-aged-man-portrait-02.html\">02</a>. IT office: <a href=\"../gallery/computer-technician-office.html\">computer technician</a>.",
        },
        {
          h: "Tech abstracts and gestures",
          p: "See <a href=\"../gallery/binary-blue-light-rays.html\">binary blue light rays</a>, <a href=\"../gallery/world-map-blue-light.html\">world map blue light</a>, <a href=\"../gallery/ethereal-hands-touch.html\">ethereal hands</a>, and the <a href=\"../gallery/ai-high-tech-lights.html\">AI light</a> series starting with <a href=\"../gallery/ai-high-tech-lights-02.html\">02</a>.",
        },
        {
          h: "Publishing",
          p: "Drop files into <code>upload/picture/</code>, run <code>npm run build</code>, and browse the <a href=\"../gallery/\">gallery index</a>. Thumbs keep lists fast—see <a href=\"webp-gallery-performance.html\">WebP performance</a>.",
        },
      ],
    },
  },
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
      desc: "城市与能源题材航拍的完整方法论：设备准备、飞行规划、构图、合规、后期、SEO 发布与 aoglang 作品索引。",
      tags: ["文章", "航拍", "无人机", "城市", "SEO", "图集", "指南"],
      intro:
        "城市航拍是 aoglang 图集的核心题材之一。本文是<strong>方法论总览</strong>，覆盖从起飞前规划到网页发布的完整流程；各城市/题材的深度解读请配合 <a href=\"tokyo-aerial-complete-guide.html\">东京完全指南</a> 与 <a href=\"fuzhou-energy-aerial-series.html\">福州与风电专题</a> 阅读。",
      sections: [
        {
          h: "航拍前：设备与天气",
          p: "消费级无人机（1 英寸传感器及以上）已能满足 Web 发布需求。出发前检查：电池满电、桨叶无损、存储空间充足、GPS 搜星正常。避免强风、降雨与大雾；城市热岛效应可能导致局部气流紊乱，建议先在开阔处悬停观察。",
        },
        {
          h: "选题与关键词：从地标到行业场景",
          p: "单张图片的 SEO 不只靠文件名。为作品写清<strong>地点 + 视角 + 时段</strong>（如「东京滨水高速黄昏航拍」），并在正文中自然出现「无人机」「高速公路」「城市天际线」等检索词。对照 <a href=\"../gallery/tokyo-waterside-highway.html\">东京滨水高速</a>、<a href=\"../gallery/fuzhou-stadium-aerial-01.html\">福州体育场</a> 的标题结构。",
        },
        {
          h: "构图：引导线、高度与安全距离",
          p: "高架/高速题材：让道路从画面一角斜向延伸。体育场/港口：45° 俯拍展示几何，远景纳入城市背景。高度并非越高越好——过高会损失细节，过低则受障碍物限制。始终与行人、车辆保持安全距离，遵守当地限高（常见 120m 或更低）。",
        },
        {
          h: "合规：日本、中国与公域飞行",
          p: "日本人口密集区飞行限制严格，需查阅国土交通省无人机地图。中国各城市有禁飞区（机场、政府周边等），使用官方 App 查询。本文不构成法律建议——<strong>违规飞行风险自负</strong>。能源题材如 <a href=\"../gallery/wind-turbines-drone-01.html\">海上风电</a> 还需注意海上风力与返航电量。",
        },
        {
          h: "成组发布：系列互链",
          p: "同一城市不同机位（<a href=\"../gallery/tokyo-highway-bridge-01.html\">桥面 01</a> 与 <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a>）应在专题文章中组成系列，而非孤立单页。能源与城市可跨链：<a href=\"fuzhou-energy-aerial-series.html\">福州与风电专题</a>。",
        },
        {
          h: "后期与导出",
          p: "RAW/JPEG 轻度调整：曝光、对比、清晰度，避免过度饱和。Web 导出宽度 1400–1920px 即可；列表缩略图由构建脚本生成 480px WebP——见 <a href=\"webp-gallery-performance.html\">WebP 优化指南</a>。保留 upload 原图供印刷或二次裁切。",
        },
        {
          h: "网页发布与 noindex 策略",
          p: "并非每张航拍都需要独立 SEO 落地页。本站仅<strong>8 张旗舰航拍</strong>保留 sitemap 收录，其余单图 noindex，由专题文章承载搜索意图——详见 <a href=\"aoglang-site-seo-case-study.html\">站点 SEO 复盘</a>。新作品优先更新专题段落。",
        },
        {
          h: "与视频栏目联动",
          p: "静态航拍可与 <a href=\"../videos/aerial-boat-turquoise-coast.html\">海岸俯拍短片</a> 组合：图片负责封面与文章头图，视频负责动态预览。参见 <a href=\"video-shorts-collection-guide.html\">短片合集解读</a>。",
        },
        {
          h: "作品索引",
          p: "东京：<a href=\"../gallery/tokyo-waterside-highway.html\">滨水高速</a> · <a href=\"../gallery/tokyo-highway-bridge-01.html\">桥面 01</a> · <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a>。福州/能源：<a href=\"fuzhou-energy-aerial-series.html\">专题</a>。深度：<a href=\"tokyo-aerial-complete-guide.html\">东京完全指南</a>。",
        },
      ],
    },
    en: {
      title: "Drone city aerials: Tokyo, Fuzhou & offshore wind",
      desc: "Full workflow for urban and energy drone work—gear, planning, composition, compliance, post, SEO publishing, and gallery links.",
      tags: ["article", "aerial", "drone", "urban", "SEO", "gallery", "guide"],
      intro:
        "Urban aerials anchor the aoglang gallery. This article is the <strong>methodology overview</strong>; pair it with the <a href=\"tokyo-aerial-complete-guide.html\">Tokyo feature</a> and <a href=\"fuzhou-energy-aerial-series.html\">Fuzhou &amp; wind feature</a> for city-specific depth.",
      sections: [
        {
          h: "Before flight: gear & weather",
          p: "Check batteries, props, storage, and GPS lock. Avoid strong wind, rain, and fog; urban heat islands can create turbulent pockets—hover and assess first.",
        },
        {
          h: "Topics and keywords",
          p: "Write <strong>place + angle + time</strong> in titles and body copy. Compare <a href=\"../gallery/tokyo-waterside-highway.html\">Tokyo waterside highway</a> and <a href=\"../gallery/fuzhou-stadium-aerial-01.html\">Fuzhou stadium</a> page structures.",
        },
        {
          h: "Composition & altitude",
          p: "Use roads as leading lines; 45° stadium shots show geometry; offshore wind frames need scale plus single-unit close-ups. Respect local height limits and obstacle clearance.",
        },
        {
          h: "Compliance",
          p: "Follow Japan MLIT maps and China no-fly zones—this is creative guidance, not legal advice. Offshore wind shoots need extra battery margin.",
        },
        {
          h: "Publish as linked sets",
          p: "Bridge pairs and city series belong inside features like <a href=\"tokyo-aerial-complete-guide.html\">Tokyo aerial guide</a>, not isolated thin URLs.",
        },
        {
          h: "Post & export",
          p: "Restrained edits; 1400–1920px Web heroes and 480px thumbs via the build—see <a href=\"webp-gallery-performance.html\">WebP performance</a>.",
        },
        {
          h: "noindex strategy",
          p: "Only eight flagship aerial URLs stay indexable; see <a href=\"aoglang-site-seo-case-study.html\">SEO case study</a>. Update features when adding shots.",
        },
        {
          h: "Mix with video",
          p: "Pair stills with <a href=\"../videos/aerial-boat-turquoise-coast.html\">coast aerial clip</a>—<a href=\"video-shorts-collection-guide.html\">video collection guide</a>.",
        },
        {
          h: "Gallery index",
          p: "Tokyo: <a href=\"../gallery/tokyo-waterside-highway.html\">waterside</a> · <a href=\"../gallery/tokyo-highway-bridge-01.html\">bridge 01</a> · <a href=\"../gallery/tokyo-highway-bridge-02.html\">02</a>. Fuzhou/energy: <a href=\"fuzhou-energy-aerial-series.html\">feature</a>.",
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
        "图集页往往因大图导致首屏缓慢。aoglang 在构建阶段用 <strong>sharp</strong> 将 upload 原图转为 WebP，并区分列表缩略图与详情主图。本文详解参数选择、构建流程与对 Core Web Vitals 的影响。",
      sections: [
        {
          h: "为什么要两套尺寸",
          p: "瀑布流列表可能同时展示数十张卡片，若每张都加载 4K PNG，移动网络下体验很差。本站规则：<strong>卡片用 *-thumb.webp（宽≤480px）</strong>，<strong>单图页用 *.webp（宽≤1400px）</strong>，原图仅保留在本地 upload 目录。",
        },
        {
          h: "sharp 构建参数",
          p: "在 <code>tools/build.mjs</code> 中：<code>IMAGE_MAIN_MAX = 1400</code>、<code>IMAGE_THUMB_MAX = 480</code>，WebP 质量主图 82、缩略图 78。若原图已小于目标宽度则跳过放大，避免无意义插值。运行 <code>npm run build</code> 时仅处理有变化的 upload 文件（已有 WebP 则跳过）。",
        },
        {
          h: "HTML 中的 width/height",
          p: "列表卡片与详情页 <code>&lt;img&gt;</code> 都填写 <code>width</code> 与 <code>height</code>，配合 CSS <code>--thumb-ar</code> 比例变量，减少布局偏移（CLS）。这是静态图集站提升体验分的低成本手段。",
        },
        {
          h: "与 SEO 和 AdSense 的关系",
          p: "更快的 LCP 有利于体验信号；Google 将页面体验纳入排名因素。AdSense 审核也会看「用户是否愿意停留」——首屏 3 秒内应出现内容而非空白。专题文章 + 轻量缩略图列表，比一次性加载数十张 4K 图更易通过质量评估。详见 <a href=\"aoglang-site-seo-case-study.html\">SEO 复盘</a>。",
        },
        {
          h: "ImageObject 与图片 SEO",
          p: "每张旗舰单图仍有 ImageObject JSON-LD；非旗舰单图 noindex 但保留可分享 URL。缩略图不参与 schema 的 contentUrl，主图 URL 指向 1400px WebP。",
        },
        {
          h: "发布新图流程",
          p: "将 PNG/JPG 放入 <code>upload/picture/</code>，运行 <code>npm run build</code>，脚本复制并优化到 <code>assets/img/gallery/</code>，并再生双语 HTML、sitemap 与搜索索引。更多结构见 <a href=\"static-site-guide.html\">静态网站搭建指南</a>。",
        },
        {
          h: "故障排查",
          p: "若缩略图未生成：确认已安装 <code>sharp</code>（<code>npm install</code>）且 Node 在 PATH 中。Windows 下若 npm 报 node 找不到，使用完整路径或把 Node 加入系统环境变量。",
        },
      ],
    },
    en: {
      title: "WebP thumbnails for faster gallery pages",
      desc: "Build-time 1400px heroes and 480px thumbs—indexes stay light while detail pages stay sharp.",
      tags: ["article", "WebP", "performance", "gallery", "SEO", "static"],
      intro:
        "Galleries often feel slow because indexes load huge PNGs. aoglang converts uploads to <strong>WebP at build time</strong> with separate thumb and hero sizes—parameters, HTML hints, and Core Web Vitals impact below.",
      sections: [
        {
          h: "Why two sizes",
          p: "Masonry grids may show dozens of cards at once. We serve <strong>*-thumb.webp (≤480px wide)</strong> on lists and <strong>*.webp (≤1400px)</strong> on detail pages; originals stay in <code>upload/picture/</code> only.",
        },
        {
          h: "sharp settings",
          p: "In <code>tools/build.mjs</code>: main max 1400px, thumb max 480px, WebP quality 82/78. Skips upscaling when sources are already smaller.",
        },
        {
          h: "width/height in HTML",
          p: "Every <code>&lt;img&gt;</code> includes dimensions plus <code>--thumb-ar</code> to reduce CLS on masonry cards.",
        },
        {
          h: "SEO & AdSense",
          p: "Better LCP supports rankings and quality reviews—see <a href=\"aoglang-site-seo-case-study.html\">SEO case study</a>.",
        },
        {
          h: "ImageObject",
          p: "Flagship photos keep ImageObject schema pointing at 1400px WebP heroes; thin gallery URLs are noindex.",
        },
        {
          h: "Adding new photos",
          p: "Drop files into <code>upload/picture/</code>, run <code>npm run build</code>. See <a href=\"static-site-guide.html\">static site guide</a>.",
        },
        {
          h: "Troubleshooting",
          p: "Install <code>sharp</code> via <code>npm install</code>; ensure Node is on PATH (especially on Windows).",
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
        "视频不必全部依赖外链平台。本站 <a href=\"../videos/\">视频栏目</a> 提供自托管 MP4 示例，每支短片均有独立说明页。本文详解页面结构、结构化数据与完整发布流程；栏目总览见 <a href=\"video-shorts-collection-guide.html\">短片合集解读</a>。",
      sections: [
        {
          h: "页面必备元素",
          p: "每支视频应有：<strong>唯一 URL</strong>、清晰的 <code>h1</code> 与 <code>meta description</code>、封面图 <code>poster</code>、时长说明，以及 VideoObject JSON-LD。参考 <a href=\"../videos/tech-visual-short.html\">科技视觉短片</a> 与 <a href=\"../videos/warm-visual-clip.html\">暖色视觉短片</a>。",
        },
        {
          h: "VideoObject 字段示例",
          p: "构建脚本输出 <code>@type: VideoObject</code>，含 <code>name</code>、<code>description</code>、<code>contentUrl</code>（指向 <code>assets/media/video/*.mp4</code>）、<code>thumbnailUrl</code>、<code>duration</code>（ISO 8601，如 PT14S）、<code>uploadDate</code>。可在 Google 富媒体结果测试工具中验证。",
        },
        {
          h: "poster 与首屏体验",
          p: "poster 图片应接近视频首帧，尺寸与视频比例一致，避免 CLS。构建时若 poster 不存在会尝试用 ffmpeg 从 MP4 截取；也可手动放入 <code>assets/img/video/</code>。",
        },
        {
          h: "体积与加载",
          p: "短视频适合控制在十余秒内，并压缩码率；首屏仍可用 poster 图片避免空白。若文件过大，可外链 CDN 并在文章中说明源地址。5–15 秒 1080p 建议 2–5 Mbps。",
        },
        {
          h: "无障碍",
          p: "使用 <code>controls</code> 与 <code>playsinline</code>；不默认有声自动播放。每页 sections 文字说明视频内容，满足听障/无声环境用户。",
        },
        {
          h: "与图集、文章联动",
          p: "视频页链到 <a href=\"../gallery/ai-high-tech-lights.html\">科技光效</a>、<a href=\"video-shorts-collection-guide.html\">合集专题</a>，形成主题集群。",
        },
        {
          h: "发布流程（VIDEOS 数组）",
          p: "MP4 放入 <code>upload/video/</code> → 在 <code>tools/build.mjs</code> 的 <code>VIDEOS</code> 登记 slug、poster、双语 sections → <code>npm run build</code> → 更新 <a href=\"video-shorts-collection-guide.html\">合集文章</a> 与 sitemap。",
        },
      ],
    },
    en: {
      title: "Self-hosted MP4 pages: UX and video SEO",
      desc: "Posters, bilingual copy, VideoObject schema, and internal links for short clips hosted on a static site.",
      tags: ["article", "video", "SEO", "MP4", "self-hosted", "schema"],
      intro:
        "You do not have to embed every clip from a third-party platform. The <a href=\"../videos/\">video section</a> hosts MP4 examples with dedicated pages. For the full collection write-up, see <a href=\"video-shorts-collection-guide.html\">self-hosted shorts collection</a>.",
      sections: [
        {
          h: "What each page needs",
          p: "Provide a <strong>unique URL</strong>, clear <code>h1</code> and <code>meta description</code>, a <code>poster</code> image, duration text, and VideoObject JSON-LD—see <a href=\"../videos/tech-visual-short.html\">tech visual short</a> and <a href=\"../videos/warm-visual-clip.html\">warm visual clip</a>.",
        },
        {
          h: "VideoObject fields",
          p: "The build emits <code>VideoObject</code> with <code>contentUrl</code>, <code>thumbnailUrl</code>, ISO <code>duration</code> (e.g. PT14S), and <code>uploadDate</code>. Validate in Google’s rich results test.",
        },
        {
          h: "Posters & first paint",
          p: "Posters should match aspect ratio and approximate the first frame. ffmpeg can generate missing posters during build.",
        },
        {
          h: "File size",
          p: "Keep shorts under ~15 seconds; target ~2–5 Mbps at 1080p. Use CDN for very large sources.",
        },
        {
          h: "Accessibility",
          p: "Use controls and playsinline; no loud autoplay. Surround players with descriptive copy.",
        },
        {
          h: "Link galleries and articles",
          p: "Cross-link <a href=\"../gallery/ai-high-tech-lights.html\">AI lights</a> and the <a href=\"video-shorts-collection-guide.html\">collection feature</a>.",
        },
        {
          h: "Publish workflow",
          p: "Drop MP4 in <code>upload/video/</code>, register in <code>VIDEOS</code>, run <code>npm run build</code>, update the collection article and sitemap.",
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
        "除航拍外，本站图集还包含<strong>科技、办公、能源与人物</strong>等题材。完整工业与半导体选题请阅 <a href=\"tech-industry-visual-handbook.html\">科技与工业视觉手册</a>；本文补充生活方式与内容策划思路。",
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
        "Beyond aerials, the gallery covers <strong>tech, work, energy, and people</strong>. For semiconductor and industrial picks, read the <a href=\"tech-industry-visual-handbook.html\">tech &amp; industry handbook</a>; this article adds lifestyle planning notes.",
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
      intro: "本站是<strong>纯 HTML 静态站</strong>：无数据库、无 PHP，由编辑团队维护的中英文双语内容站。我们专注发布<strong>深度专题文章</strong>，配合图集与自托管视频，而非批量堆叠薄内容页面。",
      sections: [
        {
          h: "你能在这里找到什么",
          p: "栏目包括：<strong><a href=\"./\">文章</a></strong>（航拍指南、视觉手册、静态站实践）、<strong><a href=\"../gallery/\">图集</a></strong>（航拍、3D 与人物商务视觉）、<strong><a href=\"../videos/\">视频</a></strong>（自托管 MP4 短片）。建议从精选专题开始阅读。",
        },
        {
          h: "精选专题（推荐起点）",
          p: "<a href=\"aoglang-site-seo-case-study.html\">站点 SEO 复盘</a> · <a href=\"tokyo-aerial-complete-guide.html\">东京航拍完全指南</a> · <a href=\"infinity-3d-complete-guide.html\">无穷符号 3D 完全指南</a> · <a href=\"video-shorts-collection-guide.html\">自托管短片合集</a> · <a href=\"business-portrait-visual-handbook.html\">人物商务视觉手册</a> · <a href=\"tech-industry-visual-handbook.html\">科技工业视觉手册</a>。",
        },
        {
          h: "关于内容与授权",
          p: "内容由 aoglang 编辑团队撰写或审核。转载请注明来源并链接原文；商业使用请邮件 <a href=\"mailto:hello@aoglang.com\">hello@aoglang.com</a>。详见<a href=\"../about/\">关于我们</a>。",
        },
        {
          h: "下一步",
          p: "阅读 <a href=\"static-site-guide.html\">静态网站搭建指南</a>，或浏览 <a href=\"../gallery/tokyo-waterside-highway.html\">东京滨水高速</a> 航拍作品。",
        },
      ],
    },
    en: {
      title: "Welcome to aoglang",
      desc: "About the aoglang bilingual static site—articles, galleries, videos, and SEO.",
      tags: ["article", "guide", "static", "bilingual"],
      intro: "This is a <strong>pure HTML static site</strong>—no database, no PHP—maintained as a bilingual editorial project with <strong>in-depth features</strong>, galleries, and self-hosted video.",
      sections: [
        {
          h: "What you'll find",
          p: "Sections include <strong><a href=\"./\">articles</a></strong> (aerial guides, visual handbooks, static-site notes), the <strong><a href=\"../gallery/\">gallery</a></strong>, and <strong><a href=\"../videos/\">videos</a></strong>. Start with the featured guides below.",
        },
        {
          h: "Featured guides",
          p: "<a href=\"aoglang-site-seo-case-study.html\">SEO case study</a> · <a href=\"tokyo-aerial-complete-guide.html\">Tokyo aerial guide</a> · <a href=\"infinity-3d-complete-guide.html\">Infinity 3D guide</a> · <a href=\"video-shorts-collection-guide.html\">Video collection</a> · <a href=\"business-portrait-visual-handbook.html\">Portrait handbook</a> · <a href=\"tech-industry-visual-handbook.html\">Tech &amp; industry handbook</a>.",
        },
        {
          h: "Content & licensing",
          p: "Editorial content by the aoglang team. Credit and link when republishing; email <a href=\"mailto:hello@aoglang.com\">hello@aoglang.com</a> for commercial use. See <a href=\"../about/\">About</a>.",
        },
        {
          h: "Next steps",
          p: "Read the <a href=\"static-site-guide.html\">static site guide</a> or browse <a href=\"../gallery/tokyo-waterside-highway.html\">Tokyo waterside highway</a>.",
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
      intro: "aoglang 使用 Node.js 构建脚本（<code>tools/build.mjs</code>）维护双语页面。本文说明目录结构、内容发布流程，以及我们如何通过<strong>专题文章优先、单图页 noindex</strong>策略提升内容质量。",
      sections: [
        {
          h: "目录结构",
          p: "<pre><code>zh/  en/  assets/  tools/build.mjs  sitemap.xml</code></pre> 新文章在 <code>ARTICLES</code> 数组登记后运行 <code>npm run build</code>，自动生成列表、RSS、搜索索引与 sitemap。",
        },
        {
          h: "内容策略：专题优先",
          p: "深度专题（如 <a href=\"tokyo-aerial-complete-guide.html\">东京航拍完全指南</a>）是 SEO 与 AdSense 审核的核心。批量单图页默认 <code>noindex</code>，仅保留航拍旗舰作品在 sitemap 中——见 <code>INDEXABLE_PICTURE_SLUGS</code>。",
        },
        {
          h: "每篇新文章 checklist",
          p: "填写 slug、日期、双语 title/description、至少 4 段 sections（每段 80 字以上）；构建会写入作者署名、BlogPosting schema、RSS 与首页精选（若加入 <code>HOME_FEATURED</code> 或 <code>HOME_LATEST</code>）。",
        },
        {
          h: "图片与性能",
          p: "图集使用 WebP 主图与缩略图，详见 <a href=\"webp-gallery-performance.html\">WebP 优化指南</a>。视频大文件可外链 CDN。",
        },
        {
          h: "部署后通知搜索引擎",
          p: "执行 <code>npm run build</code> 上传后运行 <code>npm run ping-sitemap</code>，向 Google/Bing ping sitemap。并在 Search Console 手动提交 <code>sitemap.xml</code>——详见 <a href=\"aoglang-site-seo-case-study.html\">站点 SEO 复盘</a>。",
        },
        {
          h: "E-E-A-T 与关于页",
          p: "保持<a href=\"../about/\">关于我们</a>、<a href=\"../contact/\">联系</a>、<a href=\"../privacy/\">隐私政策</a>更新。文章底部自动添加作者署名（<code>SITE_AUTHOR</code>）。",
        },
      ],
    },
    en: {
      title: "Static site guide",
      desc: "Folder layout, SEO, RSS, sitemap, and search index checklist for aoglang.",
      tags: ["article", "SEO", "static", "sitemap"],
      intro: "A Node build script (<code>tools/build.mjs</code>) keeps bilingual pages in sync. This guide covers layout, publishing, and our <strong>feature-first / noindex thin gallery</strong> quality strategy.",
      sections: [
        {
          h: "Folder layout",
          p: "<pre><code>zh/  en/  assets/  tools/build.mjs  sitemap.xml</code></pre> Register posts in <code>ARTICLES</code>, then run <code>npm run build</code>.",
        },
        {
          h: "Feature-first content",
          p: "Long-form features (e.g. <a href=\"tokyo-aerial-complete-guide.html\">Tokyo aerial guide</a>) carry SEO weight. Most single-image URLs are <code>noindex</code>; only flagship aerials stay in the sitemap—see <code>INDEXABLE_PICTURE_SLUGS</code>.",
        },
        {
          h: "New article checklist",
          p: "Set slug, date, bilingual copy, and several substantive sections; the build adds author bylines, BlogPosting schema, RSS, and home listings when configured in <code>HOME_FEATURED</code> / <code>HOME_LATEST</code>.",
        },
        {
          h: "Images and video",
          p: "See <a href=\"webp-gallery-performance.html\">WebP gallery performance</a>. Host very large MP4 files on a CDN if needed.",
        },
        {
          h: "After deploy",
          p: "Run <code>npm run ping-sitemap</code> after upload; also submit <code>sitemap.xml</code> in Search Console—see <a href=\"aoglang-site-seo-case-study.html\">SEO case study</a>.",
        },
        {
          h: "Trust pages",
          p: "Keep <a href=\"../about/\">About</a>, <a href=\"../contact/\">Contact</a>, and <a href=\"../privacy/\">Privacy</a> current. Author credit comes from <code>SITE_AUTHOR</code>.",
        },
      ],
    },
  },
];

/** 首页「最新内容」顺序（构建时在 PICTURES 可用后生成） */
const HOME_LATEST = [
  { type: "article", slug: "aoglang-site-seo-case-study" },
  { type: "article", slug: "tech-industry-visual-handbook" },
  { type: "article", slug: "video-shorts-collection-guide" },
  { type: "article", slug: "infinity-3d-complete-guide" },
  { type: "article", slug: "tokyo-aerial-complete-guide" },
  { type: "video", slug: "aerial-boat-turquoise-coast" },
  { type: "article", slug: "drone-aerial-city-photography" },
  { type: "article", slug: "fuzhou-energy-aerial-series" },
  { type: "gallery", slug: "infinity-3d" },
  { type: "article", slug: "business-portrait-visual-handbook" },
  { type: "gallery", slug: "tokyo-waterside-highway" },
  { type: "article", slug: "webp-gallery-performance" },
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
${articleAuthorFooter(lang, a.date)}
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
    author: {
      "@type": "Organization",
      name: lang === "zh" ? SITE_AUTHOR.nameZh : SITE_AUTHOR.nameEn,
      email: SITE_AUTHOR.email,
    },
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
${homeFeaturedSection("zh")}
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
${homeFeaturedSection("en")}
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

function pictureSections(loc, isZh, p) {
  const topicSlug = pictureTopicArticleSlug(p);
  let topicTitle = null;
  if (topicSlug) {
    try {
      const topic = articleBySlug(topicSlug);
      topicTitle = isZh ? topic.zh.title : topic.en.title;
    } catch {
      topicTitle = null;
    }
  }

  const sections = [{ h: isZh ? "画面介绍" : "About this image", p: loc.desc }];

  if (topicSlug && topicTitle) {
    sections.push({
      h: isZh ? "所属专题" : "Featured in",
      p: isZh
        ? `本作品是专题《<a href="../articles/${topicSlug}.html">${topicTitle}</a>》的一部分。建议阅读完整专题以了解创作背景、行业应用场景与相关作品。`
        : `Part of <a href="../articles/${topicSlug}.html">${topicTitle}</a>—read the full feature for context, use cases, and related work.`,
    });
  }

  if (pictureIsIndexable(p)) {
    sections.push({
      h: isZh ? "拍摄与用途" : "Capture notes & use cases",
      p: isZh
        ? "本页为航拍旗舰作品，保留搜索引擎收录。适用于媒体报道、旅行与城市基建类内容配图。如需高清原图或商业授权，请通过<a href=\"../contact/\">联系页</a>邮件咨询。"
        : "This flagship aerial remains indexable for search. Suitable for travel and infrastructure stories. For originals or commercial licensing, <a href=\"../contact/\">contact us</a>.",
    });
  }

  sections.push({
    h: isZh ? "使用与授权" : "Use & licensing",
    p: isZh
      ? "个人博客、演示与非商业场景可注明 <strong>aoglang</strong> 并链接本页或对应专题。请勿移除水印或冒充原创。"
      : "Non-commercial use is welcome with credit and a link to <strong>aoglang</strong> or the related feature. Do not remove credits or misrepresent authorship.",
  });

  return sections;
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
  aiLights: 0,
  computerTechnician: 0,
  livingRoomWoman: 0,
  customerService: 0,
  contactUsCall: 0,
  middleAgedPortrait: 0,
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
  } else if (/sitting on the floor.*livin|chinese woman.*living/i.test(prompt)) {
    pictureInferCounters.livingRoomWoman += 1;
    const n = pictureInferCounters.livingRoomWoman;
    finish(
      `chinese-woman-living-room-${String(n).padStart(2, "0")}`,
      {
        title: `客厅地面坐姿 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "中国女性居家客厅地面坐姿，自然光与轻松氛围，适合生活方式、家居与人物类内容配图。",
        keywords: ["女性", "客厅", "居家", "生活方式", "人物", "肖像", "aoglang"],
      },
      {
        title: `Chinese woman in living room ${n > 1 ? n : ""}`.trim(),
        desc: "A Chinese woman seated on the living room floor—casual lifestyle and portrait storytelling.",
        keywords: ["woman", "living room", "lifestyle", "portrait", "home", "aoglang"],
      }
    );
  } else if (/happy.*chinese woman.*talking|talking on the phone|beautiful chinese woman.*talking/i.test(
      prompt
    )) {
    finish(
      "young-woman-phone-call",
      {
        title: "年轻女性电话交谈",
        desc: "开心打电话的年轻中国女性，适合电信、社交应用、客服与移动沟通类视觉。",
        keywords: ["女性", "电话", "通话", "微笑", "电信", "移动", "aoglang"],
      },
      {
        title: "Young woman talking on the phone",
        desc: "A happy young Chinese woman on a phone call—telecom, social apps, and mobile communication.",
        keywords: ["woman", "phone", "call", "smile", "telecom", "mobile", "aoglang"],
      }
    );
  } else if (/hands.*ethereal|ethereal gl|reaching out to touch/i.test(prompt)) {
    finish(
      "ethereal-hands-touch",
      {
        title: "灵性能量手势",
        desc: "双手伸向空灵光晕的创意画面，适合冥想、科技交互与未来感视觉主题。",
        keywords: ["手势", "灵光", "创意", "冥想", "科技", "抽象", "aoglang"],
      },
      {
        title: "Ethereal hands reaching light",
        desc: "Hands reaching toward an ethereal glow—meditation, tech UI concepts, and futuristic mood.",
        keywords: ["hands", "ethereal", "light", "creative", "meditation", "futuristic", "aoglang"],
      }
    );
  } else if (/binary.*light ray|blue light rays and binary/i.test(prompt)) {
    finish(
      "binary-blue-light-rays",
      {
        title: "二进制蓝光科技背景",
        desc: "蓝色光线与二进制代码抽象背景，适合网络安全、数据与高科技发布会视觉。",
        keywords: ["二进制", "蓝光", "科技", "背景", "数据", "网络", "aoglang"],
      },
      {
        title: "Binary code blue light rays",
        desc: "Abstract blue rays with binary code—cybersecurity, data, and tech event backgrounds.",
        keywords: ["binary", "blue", "light", "tech", "data", "cyber", "aoglang"],
      }
    );
  } else if (/world map.*blue light|silhouette of the world map/i.test(prompt)) {
    finish(
      "world-map-blue-light",
      {
        title: "世界地图蓝光轮廓",
        desc: "蓝色光线勾勒的世界地图剪影，适合全球化、物流、通信与科技品牌视觉。",
        keywords: ["世界地图", "蓝光", "轮廓", "全球", "科技", "通信", "aoglang"],
      },
      {
        title: "World map blue light silhouette",
        desc: "World map silhouette with blue light rays—global business, logistics, and telecom themes.",
        keywords: ["world map", "blue light", "global", "tech", "silhouette", "aoglang"],
      }
    );
  } else if (/customer service|customer_service/i.test(prompt)) {
    pictureInferCounters.customerService += 1;
    const n = pictureInferCounters.customerService;
    finish(
      `customer-service-smile-${String(n).padStart(2, "0")}`,
      {
        title: `微笑客服形象 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "微笑的中国女性客服工作人员，专业亲和，适合呼叫中心、在线客服与企业服务宣传。",
        keywords: ["客服", "微笑", "女性", "服务", "呼叫中心", "商务", "aoglang"],
      },
      {
        title: `Smiling customer service staff ${n > 1 ? n : ""}`.trim(),
        desc: "Smiling Chinese customer service professional—call center, support, and corporate service visuals.",
        keywords: ["customer service", "smile", "support", "call center", "business", "aoglang"],
      }
    );
  } else if (/contact us.*call mobile|business style call/i.test(prompt)) {
    pictureInferCounters.contactUsCall += 1;
    const n = pictureInferCounters.contactUsCall;
    finish(
      `contact-us-mobile-call-${String(n).padStart(2, "0")}`,
      {
        title: `联系我们来电 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "商务风格女性使用手机通话，强调联系我们、客户沟通与移动办公场景。",
        keywords: ["联系我们", "电话", "商务", "女性", "手机", "客服", "aoglang"],
      },
      {
        title: `Contact us mobile call ${n > 1 ? n : ""}`.trim(),
        desc: "Business-style woman on a mobile call—contact us, client communication, and remote work.",
        keywords: ["contact us", "mobile", "call", "business", "woman", "support", "aoglang"],
      }
    );
  } else if (/portrait.*middle-aged|smiling middle-aged man/i.test(prompt)) {
    pictureInferCounters.middleAgedPortrait += 1;
    const n = pictureInferCounters.middleAgedPortrait;
    finish(
      `middle-aged-man-portrait-${String(n).padStart(2, "0")}`,
      {
        title: `中年男士微笑肖像 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "微笑中年男性肖像，手势自然，适合金融、咨询、企业领导与信任感营销视觉。",
        keywords: ["肖像", "男性", "中年", "微笑", "商务", "信任", "aoglang"],
      },
      {
        title: `Smiling middle-aged man portrait ${n > 1 ? n : ""}`.trim(),
        desc: "Portrait of a smiling middle-aged man—finance, consulting, leadership, and trust-focused branding.",
        keywords: ["portrait", "man", "middle-aged", "smile", "business", "trust", "aoglang"],
      }
    );
  } else if (/computer technician|technology office/i.test(prompt)) {
    pictureInferCounters.computerTechnician += 1;
    const n = pictureInferCounters.computerTechnician;
    const slugTech =
      n === 1 ? "computer-technician-office" : `computer-technician-office-${String(n).padStart(2, "0")}`;
    finish(
      slugTech,
      {
        title: `电脑技术员办公 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "技术员在简约办公室操作电脑，强调 IT 支持、企业科技与数字化运维场景。",
        keywords: ["电脑", "技术员", "办公室", "IT", "科技", "运维", "aoglang"],
      },
      {
        title: `Computer technician at work ${n > 1 ? n : ""}`.trim(),
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
    pictureInferCounters.aiLights += 1;
    const n = pictureInferCounters.aiLights;
    const slugAi = n === 1 ? "ai-high-tech-lights" : `ai-high-tech-lights-${String(n).padStart(2, "0")}`;
    finish(
      slugAi,
      {
        title: `AI 高科技光效 ${n > 1 ? "· " + n : ""}`.trim(),
        desc: "人工智能与高科技光效视觉，蓝紫色调与未来感线条，适合 AI、科技品牌与发布会素材。",
        keywords: ["AI", "人工智能", "高科技", "光效", "未来感", "科技", "aoglang"],
      },
      {
        title: `AI high-tech light effects ${n > 1 ? n : ""}`.trim(),
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

/** 已发布页面的 upload 文件名 → 固定 slug，避免重复入库时顺序变化覆盖主图 */
const UPLOAD_SLUG_OVERRIDE = {
  "kolang1399_download_computer_technician_technology_office_simpl_a2d504ec-c5a5-46ff-a443-7dec8c74add6.png":
    "computer-technician-office",
  "kolang1399_technology_high-tech_light_effects_AI_artificial_int_2fe091d4-22fd-4463-bd54-f2943cf94670.png":
    "ai-high-tech-lights",
};

function pictureEntryFromUpload(uploadFile, usedSlugs) {
  const prompt = promptFromUploadFilename(uploadFile);
  const inferred = inferPictureMeta(prompt, uploadFile);
  const rawSlug = UPLOAD_SLUG_OVERRIDE[uploadFile.toLowerCase()] || inferred.slug;
  const { zh, en } = inferred;
  const slug = uniquePictureSlug(rawSlug, usedSlugs);
  const ext = path.extname(uploadFile).toLowerCase();
  return {
    slug,
    uploadFile,
    file: `${slug}${ext}`,
    subdir: "pictures",
    w: ext === ".jpg" || ext === ".jpeg" ? 1600 : 1920,
    h: ext === ".jpg" || ext === ".jpeg" ? 1067 : 1080,
    date: "2026-06-02",
    zh: { ...zh, sections: [] },
    en: { ...en, sections: [] },
  };
}

/** 从已发布 HTML 恢复图集条目（upload 不在本地时仍能重建页面） */
function pictureEntryFromExistingHtml(slug, usedSlugs) {
  if (usedSlugs.has(slug)) return null;
  usedSlugs.add(slug);
  const htmlPath = path.join(root, "zh/gallery", `${slug}.html`);
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, "utf8");
  const titleZh = html.match(/<title>([^—<]+)/)?.[1]?.trim() || slug;
  const descZh = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || titleZh;
  const titleEnMatch = fs.existsSync(path.join(root, "en/gallery", `${slug}.html`))
    ? fs.readFileSync(path.join(root, "en/gallery", `${slug}.html`), "utf8")
    : "";
  const titleEn = titleEnMatch.match(/<title>([^—<]+)/)?.[1]?.trim() || titleZh;
  const descEn = titleEnMatch.match(/<meta name="description" content="([^"]+)"/)?.[1] || descZh;
  const kwMatch = html.match(/class="gallery-keywords">([\s\S]*?)<\/p>/);
  const keywords = kwMatch
    ? [...kwMatch[1].matchAll(/<span class="tag">([^<]+)<\/span>/g)].map((m) => m[1])
    : [slug.replace(/-/g, " "), "aoglang"];
  return {
    slug,
    uploadFile: `${slug}.webp`,
    file: `${slug}.webp`,
    subdir: slug.startsWith("wqd-") ? "wqd" : "pictures",
    w: 1400,
    h: 785,
    date: "2026-06-02",
    collection: slug.startsWith("wqd-") ? INFINITY_SLUG : undefined,
    zh: { title: titleZh, desc: descZh, keywords },
    en: { title: titleEn, desc: descEn, keywords },
  };
}

function discoverExistingGalleryHtml(usedSlugs) {
  const dir = path.join(root, "zh/gallery");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .filter((slug) => !["index", "infinity-3d", "spring-scenes"].includes(slug))
    .map((slug) => pictureEntryFromExistingHtml(slug, usedSlugs))
    .filter(Boolean);
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
  pictureInferCounters.aiLights = 0;
  pictureInferCounters.computerTechnician = 0;
  pictureInferCounters.livingRoomWoman = 0;
  pictureInferCounters.customerService = 0;
  pictureInferCounters.contactUsCall = 0;
  pictureInferCounters.middleAgedPortrait = 0;

  const usedSlugs = new Set();
  const aerial = AERIAL_PICTURES.map((p) => {
    usedSlugs.add(p.slug);
    return {
      ...p,
      zh: { ...p.zh },
      en: { ...p.en },
    };
  });
  const discovered = discoverUploadPictures(usedSlugs);
  if (discovered.length) {
    console.log("discovered", discovered.length, "new picture(s) from upload/picture");
  }
  const fromHtml = discoverExistingGalleryHtml(usedSlugs);
  if (fromHtml.length) {
    console.log("restored", fromHtml.length, "picture(s) from existing gallery HTML");
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
      zh: { ...item.zh },
      en: { ...item.en },
    };
  });
  return [...aerial, ...discovered, ...fromHtml, ...wqd];
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
  const topicSlug = pictureTopicArticleSlug(p);
  const sections = pictureSections(loc, isZh, p)
    .map((s) => `      <h2>${s.h}</h2>\n      <p>${s.p}</p>`)
    .join("\n");
  const collectionLink = p.collection
    ? `<p class="card-meta">${isZh ? "所属合辑：" : "Collection: "}<a href="${p.collection}.html">${isZh ? "无穷符号 3D 视觉" : "Infinity 3D visuals"}</a> · <a href="../articles/infinity-3d-brand-visuals.html">${isZh ? "阅读 3D 专题" : "Read 3D feature"}</a></p>`
    : "";
  const noindexNote = !pictureIsIndexable(p)
    ? `<p class="gallery-noindex-note">${isZh ? "提示：本页主要为作品分享，完整解读请阅读" : "Note: full context lives in our feature article "}<a href="../articles/${topicSlug || "tokyo-aerial-complete-guide"}.html">${isZh ? "对应专题" : "linked here"}</a>。</p>`
    : "";

  return `    <ol class="breadcrumb"><li><a href="../">${isZh ? "首页" : "Home"}</a></li><li><a href="./">${isZh ? "图集" : "Gallery"}</a></li><li aria-current="page">${loc.title}</li></ol>
    <header class="article-header">
      <h1>${loc.title}</h1>
      <p class="card-meta">${p.w}×${p.h} · ${p.date} · <a href="${crossLangHref(otherLang, `gallery/${p.slug}.html`, 3)}" hreflang="${otherLang}">${otherLabel}</a></p>
      ${collectionLink}
      ${noindexNote}
      <p class="gallery-intro">${loc.desc}</p>
    </header>
    <article class="prose picture-article">
      <figure class="picture-hero"${cardThumbAttr(p.w, p.h)}>
        <img src="${imgSrc}" width="${p.w}" height="${p.h}" alt="${loc.title}" loading="eager" decoding="async">
      </figure>
${sections}
      <h2>${isZh ? "标签" : "Tags"}</h2>
      <p class="gallery-keywords">${pictureTagsHtml(loc.keywords)}</p>
      <p>${isZh ? "更多：" : "More: "}<a href="./">${isZh ? "图集首页" : "Gallery index"}</a>${p.collection ? ` · <a href="${p.collection}.html">${isZh ? "3D 无穷合辑" : "Infinity set"}</a>` : ""}${topicSlug ? ` · <a href="../articles/${topicSlug}.html">${isZh ? "阅读专题" : "Read feature"}</a>` : ""} · <a href="../videos/">${isZh ? "视频" : "Videos"}</a></p>
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

function galleryTopicArticleCards(isZh) {
  return HOME_FEATURED.map((slug) => {
    const a = articleBySlug(slug);
    const loc = isZh ? a.zh : a.en;
    const thumb = articleThumbProps(a, isZh ? "zh" : "en");
    return cardArticle({
      thumbStyle: cardThumbAttr(thumb.w, thumb.h),
      imgSrc: `../../${thumb.src}`,
      imgW: thumb.w,
      imgH: thumb.h,
      imgAlt: thumb.alt || loc.title,
      href: `../articles/${a.slug}.html`,
      heading: loc.title,
      meta: `<span class="tag">${isZh ? "专题" : "Feature"}</span> ${a.date}`,
    });
  }).join("\n      ");
}

function galleryIndexCards(isZh) {
  const topicCards = galleryTopicArticleCards(isZh);
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
  return `${topicCards}\n      ${infinity}\n      ${pictureCards}\n      ${spring}`;
}

function galleryAllWorkCards(isZh) {
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
  return `${infinity}\n      ${pictureCards}\n      ${spring}`;
}

for (const lang of ["zh", "en"]) {
  const isZh = lang === "zh";
  const listDesc = isZh
    ? `深度专题文章配合图集作品。建议先阅读专题，再浏览单张作品详情。`
    : `In-depth features paired with gallery work—start with a feature, then browse individual photos.`;

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
    <h2 class="section-title">${isZh ? "精选专题" : "Featured guides"}</h2>
    <div class="masonry-grid">${galleryTopicArticleCards(isZh)}</div>
    <h2 class="section-title">${isZh ? "全部作品" : "All work"}</h2>
    <div class="masonry-grid">${galleryAllWorkCards(isZh)}</div>`
    )
  );

  for (const p of PICTURES) {
    const loc = isZh ? p.zh : p.en;
    const indexable = pictureIsIndexable(p);
    write(
      `${lang}/gallery/${p.slug}.html`,
      page(lang, 3, "gallery", `gallery/${p.slug}.html`, {
        title: `${loc.title} — ${isZh ? "图片" : "Photo"} — aoglang`,
        desc: loc.desc,
        canonical: `${SITE}/${lang}/gallery/${p.slug}.html`,
        type: "article",
        noindex: !indexable,
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
      noindex: true,
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
    desc: "十张无穷符号主题 3D 视觉作品，附中文说明与品牌应用建议。",
    intro:
      "十张三维无穷符号与缎带抽象视觉合辑，涵盖铜色金属、螺旋缎带、双色镀铬与虹彩玻璃等风格。建议先阅读 <a href=\"../articles/infinity-3d-complete-guide.html\">无穷符号 3D 完全指南</a> 了解每件作品的适用场景，再通过下方卡片浏览单件详情。",
    h1: "无穷符号 3D 视觉",
  };
  const metaEn = {
    title: "Infinity 3D visual gallery — aoglang",
    desc: "Ten infinity-themed 3D visuals with captions and brand use-case notes.",
    intro:
      "Ten infinity-themed 3D renders—from copper metal to iridescent glass. Read the <a href=\"../articles/infinity-3d-complete-guide.html\">Infinity 3D complete guide</a> first, then browse individual pieces below.",
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
    <article class="prose">
      <p>${isZh ? "合辑页集中展示系列全貌；单件作品页面主要用于分享链接。完整解读与品牌应用 checklist 见" : "This collection page is the SEO hub; single-piece URLs are mainly for sharing. Full write-up: "}<a href="../articles/infinity-3d-complete-guide.html">${isZh ? "3D 完全指南" : "Infinity 3D complete guide"}</a>。</p>
    </article>
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
      <p class="gallery-noindex-note">${isZh ? "完整栏目解读：" : "Full collection guide: "}<a href="../articles/${VIDEO_FEATURE_SLUG}.html">${isZh ? "自托管短片合集解读" : "Self-hosted shorts collection"}</a></p>
${sections}
      <h2>${isZh ? "相关标签" : "Tags"}</h2>
      <p class="gallery-keywords">${videoTagsHtml(loc.tags)}</p>
      <p>${isZh ? "更多内容：" : "More: "}<a href="./">${isZh ? "全部视频" : "All videos"}</a> · <a href="../articles/${VIDEO_FEATURE_SLUG}.html">${isZh ? "视频专题" : "Video feature"}</a> · <a href="../gallery/">${isZh ? "图集" : "Gallery"}</a> · <a href="../articles/">${isZh ? "文章" : "Articles"}</a></p>
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
    ? `${VIDEOS.length} 支自托管 MP4 短片，建议先阅读专题文章了解每支视频的题材与 SEO 实践。`
    : `${VIDEOS.length} self-hosted MP4 clips—start with the feature article for context and SEO notes.`;
  const videoFeatureCard = (() => {
    const a = articleBySlug(VIDEO_FEATURE_SLUG);
    const loc = isZh ? a.zh : a.en;
    const thumb = articleThumbProps(a, lang);
    return cardArticle({
      thumbStyle: cardThumbAttr(thumb.w, thumb.h),
      imgSrc: `../../${thumb.src}`,
      imgW: thumb.w,
      imgH: thumb.h,
      imgAlt: thumb.alt || loc.title,
      href: `../articles/${a.slug}.html`,
      heading: loc.title,
      meta: `<span class="tag">${isZh ? "专题" : "Feature"}</span> ${a.date}`,
    });
  })();

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
    <h2 class="section-title">${isZh ? "推荐阅读" : "Start here"}</h2>
    <div class="masonry-grid">${videoFeatureCard}</div>
    <h2 class="section-title">${isZh ? "全部短片" : "All clips"}</h2>
    <div class="masonry-grid">${videoIndexCards(isZh)}</div>
    <p class="prose" style="margin-top:2rem"><a href="intro-aoglang.html">${isZh ? "认识 aoglang（站点介绍视频）" : "Intro to aoglang (site video)"}</a></p>`
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
      desc: isZh ? "aoglang 站点介绍与自托管视频示例。" : "About aoglang and a self-hosted video sample.",
      canonical: `${SITE}/${lang}/videos/intro-aoglang.html`,
      noindex: true,
      extra: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"VideoObject","name":"${isZh ? "认识 aoglang" : "Intro to aoglang"}","uploadDate":"2026-05-27"}</script>`,
    }, isZh
      ? `    <ol class="breadcrumb"><li><a href="../">首页</a></li><li><a href="./">视频</a></li><li aria-current="page">认识 aoglang</li></ol>
    <header class="article-header"><h1>认识 aoglang</h1><p class="card-meta"><a href="${crossLangHref("en", "videos/intro-aoglang.html", 3)}" hreflang="en">English</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="${relPrefix(3)}assets/img/video/video-01-poster.jpg">
        <source src="${relPrefix(3)}assets/media/video/video-01.mp4" type="video/mp4">
        您的浏览器不支持视频播放。
      </video>
      <p>aoglang 分享航拍、3D 视觉与人物商务类原创作品，并提供自托管 MP4 短片。更多作品请浏览<a href="./">视频列表</a>，或从<a href="../articles/tokyo-aerial-complete-guide.html">东京航拍完全指南</a>开始阅读。</p>
    </article>`
      : `    <ol class="breadcrumb"><li><a href="../">Home</a></li><li><a href="./">Videos</a></li><li aria-current="page">Intro</li></ol>
    <header class="article-header"><h1>Intro to aoglang</h1><p class="card-meta"><a href="${crossLangHref("zh", "videos/intro-aoglang.html", 3)}" hreflang="zh">中文版</a></p></header>
    <article class="prose">
      <video class="player" controls width="100%" poster="${relPrefix(3)}assets/img/video/video-01-poster.jpg">
        <source src="${relPrefix(3)}assets/media/video/video-01.mp4" type="video/mp4">
        Your browser does not support video.
      </video>
      <p>aoglang publishes aerial, 3D, and business portrait work plus self-hosted MP4 clips. Browse the <a href="./">video list</a> or start with our <a href="../articles/tokyo-aerial-complete-guide.html">Tokyo aerial guide</a>.</p>
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
        <p class="form-note">留言将发送至 ${SITE_AUTHOR.email}。我们通常在一至两个工作日内回复。</p>
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
        <p class="form-note">Messages go to ${SITE_AUTHOR.email}. We usually reply within one to two business days.</p>
      </form>
    </div>`
    )
  );
}

// About, privacy, terms
write("zh/about/index.html", page("zh", 2, "about", "about/", {
  title: "关于 — aoglang",
  desc: "aoglang 是中英文双语内容站，分享航拍、3D 视觉、人物商务场景与静态网站内容运营实践。",
  canonical: `${SITE}/zh/about/`,
  extra: `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "aoglang",
    url: `${SITE}/zh/`,
    email: SITE_AUTHOR.email,
    description: "Bilingual articles, galleries and videos on aerial photography and visual storytelling.",
  })}</script>`,
}, aboutPageBody("zh")));
write("en/about/index.html", page("en", 2, "about", "about/", {
  title: "About — aoglang",
  desc: "aoglang is a bilingual site for aerial photography, 3D visuals, business portraits, and static-site publishing.",
  canonical: `${SITE}/en/about/`,
  extra: `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "aoglang",
    url: `${SITE}/en/`,
    email: SITE_AUTHOR.email,
    description: "Bilingual articles, galleries and videos on aerial photography and visual storytelling.",
  })}</script>`,
}, aboutPageBody("en")));

write("zh/privacy/index.html", page("zh", 2, "privacy", "privacy/", {
  title: "隐私政策 — aoglang", desc: "aoglang 隐私政策说明。", canonical: `${SITE}/zh/privacy/`,
}, `    <h1>隐私政策</h1><article class="prose"><p>我们可能使用匿名访问统计（Google Analytics），用于了解页面访问量与来源，不用于识别个人身份。</p><p>若您启用 Google AdSense 等广告服务，Google 及其合作伙伴可能使用 Cookie 展示个性化或非个性化广告。您可在 Google 广告设置中管理偏好：<a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">adssettings.google.com</a>。</p><p>联系表单数据由第三方 FormSubmit 处理，请参阅其隐私条款。除您主动提交的信息外，我们不收集可识别个人身份的数据。</p><p>最后更新：2026-06-12</p></article>`));
write("en/privacy/index.html", page("en", 2, "privacy", "privacy/", {
  title: "Privacy — aoglang", desc: "aoglang privacy policy.", canonical: `${SITE}/en/privacy/`,
}, `    <h1>Privacy policy</h1><article class="prose"><p>We may use Google Analytics for anonymous traffic statistics—not to identify individuals.</p><p>When Google AdSense or similar ad services are active, Google and partners may use cookies to serve ads. Manage preferences at <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">adssettings.google.com</a>.</p><p>Contact form data is processed by FormSubmit; see their policy. We do not collect personal data unless you submit the form.</p><p>Last updated: 2026-06-12</p></article>`));

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
${VIDEOS.map((v) => rssItem(v.zh.title, `${SITE}/zh/videos/${v.slug}.html`, v.zh.desc, v.rssDate || "Tue, 27 May 2026 00:00:00 GMT")).join("\n")}
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
${VIDEOS.map((v) => rssItem(v.en.title, `${SITE}/en/videos/${v.slug}.html`, v.en.desc, v.rssDate || "Tue, 27 May 2026 00:00:00 GMT")).join("\n")}
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
  ${gtagScript()}
  ${adsenseScript()}
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
  "/zh/gallery/infinity-3d.html", "/en/gallery/infinity-3d.html",
  ...PICTURES.filter(pictureIsIndexable).flatMap((p) => [`/zh/gallery/${p.slug}.html`, `/en/gallery/${p.slug}.html`]),
  "/zh/videos/", "/en/videos/",
  ...VIDEOS.flatMap((v) => [`/zh/videos/${v.slug}.html`, `/en/videos/${v.slug}.html`]),
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
