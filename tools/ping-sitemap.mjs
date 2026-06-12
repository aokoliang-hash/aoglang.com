/**
 * 部署后 ping 搜索引擎，提醒抓取 sitemap.xml
 * 用法：npm run ping-sitemap
 * 注意：不能替代 Google Search Console 手动提交站点地图
 */
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** 从 build.mjs 读取 SITE，避免两处维护 */
const buildSrc = fs.readFileSync(path.join(root, "tools", "build.mjs"), "utf8");
const siteMatch = buildSrc.match(/const SITE = "(https?:\/\/[^"]+)"/);
const SITE = siteMatch?.[1] || "https://aoglang.com";
const sitemapUrl = `${SITE}/sitemap.xml`;

const endpoints = [
  { name: "Google", url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
];

console.log("Sitemap:", sitemapUrl);
console.log("");
console.log("Note: Bing retired the public ping URL (HTTP 410). Submit sitemap in Bing Webmaster Tools instead.");
console.log("");

for (const { name, url } of endpoints) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const ok = res.ok ? "OK" : `HTTP ${res.status}`;
    console.log(`${name}: ${ok}`);
  } catch (err) {
    console.error(`${name}: FAILED —`, err.message);
    console.error("  (Network may block outbound requests; use Search Console manually.)");
  }
}

console.log("");
console.log("Next steps:");
console.log("  1. Google Search Console → Sitemaps → submit sitemap.xml");
console.log("  2. Bing Webmaster Tools → Sitemaps → submit the same URL");
console.log("  3. URL inspection → test key feature pages");
console.log("  4. Read /zh/articles/aoglang-site-seo-case-study.html for AdSense checklist");
