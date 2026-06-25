import fs from "node:fs";
import path from "node:path";

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

export function firstCsvInDomain(csvRoot: string, domain: string): string | null {
  const dir = path.join(csvRoot, domain);
  const files = listFilesRecursive(dir).filter((file) => file.toLowerCase().endsWith(".csv"));

  if (files.length === 0) return null;

  // Prefer card_data_*.csv if present.
  const preferred = files.find((file) =>
    path.basename(file).toLowerCase().startsWith("card_data")
  );
  return preferred ?? files[0];
}
