#!/usr/bin/env node
// Generates dist/sitemap.xml for the public pages after `vite build`, and points
// robots.txt at it. Set VITE_SITE_URL (e.g. https://bokaro-defence-academy.netlify.app)
// in Netlify's environment variables; without it the script skips quietly so a
// local build never fails.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");

if (!siteUrl) {
  console.log("[sitemap] VITE_SITE_URL is not set — skipping sitemap generation.");
  process.exit(0);
}

if (!existsSync(dist)) {
  console.log("[sitemap] dist/ not found — skipping sitemap generation.");
  process.exit(0);
}

const PUBLIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/about", priority: "0.8", changefreq: "monthly" },
  { path: "/courses", priority: "0.9", changefreq: "weekly" },
  { path: "/admissions", priority: "0.9", changefreq: "weekly" },
  { path: "/results", priority: "0.7", changefreq: "monthly" },
  { path: "/gallery", priority: "0.6", changefreq: "monthly" },
  { path: "/notices", priority: "0.7", changefreq: "weekly" },
  { path: "/resources", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/refund-policy", priority: "0.3", changefreq: "yearly" },
];

const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map(
  (p) => `  <url>
    <loc>${siteUrl}${p.path === "/" ? "/" : p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
).join("\n")}
</urlset>
`;

writeFileSync(resolve(dist, "sitemap.xml"), xml, "utf8");

// Point robots.txt at the generated sitemap.
const robotsPath = resolve(dist, "robots.txt");
const robots = existsSync(robotsPath)
  ? readFileSync(robotsPath, "utf8")
  : "User-agent: *\nAllow: /\n";

const withoutSitemap = robots.replace(/^Sitemap:.*$\n?/gm, "").trimEnd();
writeFileSync(robotsPath, `${withoutSitemap}\nSitemap: ${siteUrl}/sitemap.xml\n`, "utf8");

console.log(`[sitemap] wrote ${PUBLIC_PATHS.length} URLs for ${siteUrl}`);
