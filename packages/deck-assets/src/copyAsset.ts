import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./files";

export function copyAsset(
  src: string | null,
  destDir: string,
  destBase: string,
  outRoot: string
): string | null {
  if (!src) return null;

  ensureDir(destDir);
  const ext = path.extname(src).toLowerCase();
  const dest = path.join(destDir, `${destBase}${ext}`);

  fs.copyFileSync(src, dest);

  // Browser path relative to the built app base.
  const rel = path.relative(outRoot, dest).split(path.sep).join("/");
  return `deck/${rel}`;
}
