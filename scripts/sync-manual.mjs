import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "guitar-practice-plan.html");
const destDir = join(root, "public");
const dest = join(destDir, "guitar-practice-plan.html");

if (!existsSync(src)) {
  console.error("sync-manual: missing guitar-practice-plan.html at repo root");
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
