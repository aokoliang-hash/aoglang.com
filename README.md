# aoglang

中英文双语内容分享站：文章、图集与视频。纯静态 HTML，无需数据库，适合个人站点与 SEO。

**在线仓库**：<https://github.com/aokoliang-hash/aoglang.com>

---

## 功能特性

- **双语**：`zh/` 与 `en/` 独立 URL，支持 `hreflang` 与页面互链
- **首页搜索**：首屏大搜索框，实时检索文章 / 图集 / 视频
- **内容栏目**：文章、图集、视频、关于、联系、隐私与条款
- **列表布局**：响应式卡片网格（桌面 ≥5 列），图片按比例显示（16:9、4:3、1:1、3:4）
- **SEO**：`canonical`、`sitemap.xml`、`robots.txt`、Open Graph、JSON-LD、RSS
- **无障碍**：跳过链接、语义化标签、图片 `alt`、键盘 `/` 聚焦搜索

## 技术栈

| 类型 | 说明 |
|------|------|
| 页面 | 纯 HTML |
| 样式 | CSS（`assets/css/main.css`） |
| 脚本 | 原生 JS（导航、搜索、瀑布流比例） |
| 构建 | Node.js（`tools/build.mjs`，可选） |
| 托管 | 任意静态空间（WAMP、Nginx、GitHub Pages 等） |

无前端框架、无 PHP、无数据库。

---

## 目录结构

```
aoglang.com/
├── index.html              # 语言选择入口
├── zh/                     # 中文站
│   ├── index.html          # 首页（含搜索 + 内容列表）
│   ├── articles/           # 文章
│   ├── gallery/            # 图集
│   ├── videos/             # 视频
│   ├── contact/            # 联系
│   ├── about/              # 关于
│   ├── feed.xml            # 中文 RSS
│   └── ...
├── en/                     # 英文站（结构同 zh）
├── assets/
│   ├── css/
│   ├── js/
│   ├── img/
│   └── data/search-index.json
├── tools/build.mjs         # 页面生成脚本
├── sitemap.xml
└── robots.txt
```

---

## 本地运行

### WAMP（Windows）

1. 将项目放在 `C:\wamp\www\aoglang.com\`
2. 浏览器访问：<http://localhost/aoglang.com/zh/>

### 简单静态服务（可选）

```bash
# 若已安装 Node.js，可在项目根目录执行：
npx --yes serve .
# 然后打开提示的地址，并进入 /zh/
```

---

## 构建页面

修改 `tools/build.mjs` 中的 `ARTICLES`、图集/视频数据或模板后，重新生成全站 HTML：

```bash
npm install
npm run build
```

`build.mjs` 中的 `SITE` 常量默认为 `https://aoglang.com`。构建会自动更新：

- 中英文页面、RSS、`sitemap.xml`
- `assets/data/search-index.json`
- 图集 WebP 缩略图（需 `sharp`）

---

## 发布内容

**推荐方式**：在 `tools/build.mjs` 的 `ARTICLES` 数组添加文章数据，然后 `npm run build`。无需手工改多个 HTML 文件。

### 新增文章

1. 在 `tools/build.mjs` → `ARTICLES` 添加条目（slug、date、双语 title/desc、sections）
2. 可选：加入 `HOME_FEATURED` 或 `HOME_LATEST`
3. 运行 `npm run build`

### 新增图集 / 视频

- 图片：放入 `upload/picture/`，在 `AERIAL_PICTURES` 登记或自动发现
- 视频：放入 `upload/video/`，在 `VIDEOS` 数组登记
- 运行 `npm run build`

### 图片建议

- 列表图提供 `width`、`height`，便于比例与布局
- 优先 WebP；构建脚本自动生成主图与 `-thumb.webp`

---

## 搜索引擎与 AdSense

### Google Search Console

1. 打开 [Google Search Console](https://search.google.com/search-console)
2. 添加资源：`https://aoglang.com`（网址前缀）
3. 验证所有权（DNS TXT 或 HTML 文件）
4. **站点地图** → 提交 `sitemap.xml`
5. 使用 **网址检查** 测试专题页是否可编入索引
6. 定期查看「网页」→ 编制索引、Core Web Vitals

### 部署后 ping sitemap

```bash
npm run ping-sitemap
```

会向 Google ping sitemap 更新通知（Bing 需在 Webmaster Tools 手动提交）。**仍需**在 Search Console 手动提交站点地图。

### 内容策略（AdSense）

- 以**深度专题文章**为核心（见 `HOME_FEATURED`）
- 批量单图页默认 `noindex`，由专题承载 SEO
- 完整复盘见：`/zh/articles/aoglang-site-seo-case-study.html`

---

## 部署

### GitHub Pages

1. 仓库 **Settings → Pages**
2. Source 选择 **Deploy from a branch**
3. Branch：`main`，文件夹：`/ (root)`
4. 访问：`https://aokoliang-hash.github.io/aoglang.com/zh/`（以实际用户名为准）

若使用自定义域名 `aoglang.com`，在仓库 Settings → Pages 填写域名，并在 DNS 添加 CNAME。

### 传统虚拟主机

将仓库文件上传到网站根目录，确保 Apache 已启用 `.htaccess`（404、压缩等）。

---

## 配置说明

| 文件 | 用途 |
|------|------|
| `tools/build.mjs` | 站点生成脚本（文章、图集、SEO） |
| `tools/ping-sitemap.mjs` | 部署后 ping Google/Bing sitemap |
| `assets/data/search-index.json` | 站内搜索索引（构建生成） |
| `robots.txt` / `sitemap.xml` | 搜索引擎 |
| `ads.txt` | Google AdSense 授权 |
| `site.webmanifest` | PWA 基础信息 |

---

## 浏览器支持

现代浏览器（Chrome、Firefox、Safari、Edge）。IE 不支持。

---

## 许可证

内容版权归站点作者所有。代码可按需自用与修改。

---

## 相关链接

- 仓库：<https://github.com/aokoliang-hash/aoglang.com>
- 中文首页：`/zh/`
- 英文首页：`/en/`
