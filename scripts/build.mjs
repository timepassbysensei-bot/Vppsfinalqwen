#!/usr/bin/env node
/**
 * Production build entry point.
 *
 * Why this file exists instead of just `vite build` in package.json:
 * hosted build runners do not always put `node_modules/.bin` on PATH, and some
 * of them invoke the build step as a bare command (for example `bunx build`).
 * In that situation the shell cannot find `vite` and the deploy fails with
 * "vite: command not found".
 *
 * Running the locally installed Vite through the current Node executable makes
 * the build independent of PATH, of shell lookup order, and of which package
 * manager performed the install. `bun run build`, `npm run build` and
 * `node ./scripts/build.mjs` all do the same thing.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const viteBin = resolve(root, "node_modules/vite/bin/vite.js");
const sitemapScript = resolve(root, "scripts/generate-sitemap.mjs");

function run(label, scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`\n✖ ${label} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n✖ ${label} failed (exit code ${result.status ?? "unknown"}).`);
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(viteBin)) {
  console.error(
    "✖ Vite is not installed, so the site cannot be built.\n" +
      "  Install dependencies first with `bun install` (or `npm install`).\n" +
      "  If you use a hosted build, make sure the install step does not skip\n" +
      "  devDependencies (no --production / --omit=dev), because Vite is a\n" +
      "  build-time dependency.",
  );
  process.exit(1);
}

if (!existsSync(sitemapScript)) {
  console.error("✖ scripts/generate-sitemap.mjs is missing.");
  process.exit(1);
}

run("vite build", viteBin, ["build"]);
run("sitemap generation", sitemapScript, []);

console.log("\n✔ Build complete — static output is in dist/");
