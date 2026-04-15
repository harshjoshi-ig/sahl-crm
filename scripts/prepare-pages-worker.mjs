import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const openNextDir = path.join(projectRoot, ".open-next");
const assetsDir = path.join(openNextDir, "assets");

const requiredDirs = ["cloudflare", "middleware", "server-functions", ".build"];

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function copyDir(srcName) {
  const src = path.join(openNextDir, srcName);
  const dest = path.join(assetsDir, srcName);
  ensureExists(src, `Required runtime directory (${srcName})`);
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`Copied ${srcName} -> assets/${srcName}`);
}

function main() {
  ensureExists(openNextDir, "OpenNext output directory");
  ensureExists(assetsDir, "OpenNext assets directory");

  const workerSrc = path.join(openNextDir, "worker.js");
  const workerDest = path.join(assetsDir, "_worker.js");

  ensureExists(workerSrc, "OpenNext worker file");

  for (const dirName of requiredDirs) {
    copyDir(dirName);
  }

  fs.copyFileSync(workerSrc, workerDest);
  console.log("Copied worker.js -> assets/_worker.js");
}

main();
