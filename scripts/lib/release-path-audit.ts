import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type ReleasePathFinding = {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
};

const defaultForbiddenPatterns = [
  "/home/",
  "/Desktop/",
  "file://",
  "Card_game_full",
  "Scribus_setup",
  "/mnt/data/"
];

const scanRoots = [
  "apps/web/public/deck",
  "apps/web/dist"
];

const scanExtensions = new Set([".html", ".js", ".css", ".json", ".txt", ".md", ".svg", ".map"]);

export function auditReleasePaths({
  roots = scanRoots,
  forbiddenPatterns = loadForbiddenPatterns()
}: {
  roots?: string[];
  forbiddenPatterns?: string[];
} = {}): ReleasePathFinding[] {
  const files = roots.flatMap((root) => collectFiles(root));
  return files.flatMap((file) => scanFile(file, forbiddenPatterns));
}

export function loadForbiddenPatterns(): string[] {
  const patterns = [...defaultForbiddenPatterns];
  if (fs.existsSync(".env.local")) {
    const parsed = dotenv.parse(fs.readFileSync(".env.local", "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      const trimmed = value.trim();
      if (trimmed.length < 5) continue;
      patterns.push(trimmed);
      patterns.push(`${key}=${trimmed}`);
    }
  }
  return [...new Set(patterns)];
}

function collectFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const stat = fs.statSync(root);
  if (stat.isFile()) return scanExtensions.has(path.extname(root)) ? [root] : [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function scanFile(file: string, forbiddenPatterns: string[]): ReleasePathFinding[] {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const findings: ReleasePathFinding[] = [];

  lines.forEach((lineText, index) => {
    for (const pattern of forbiddenPatterns) {
      if (!pattern || !lineText.includes(pattern)) continue;
      findings.push({
        file,
        line: index + 1,
        pattern: maskEnvPattern(pattern),
        snippet: lineText.trim().slice(0, 240)
      });
    }
  });

  return findings;
}

function maskEnvPattern(pattern: string) {
  if (!fs.existsSync(".env.local")) return pattern;
  const parsed = dotenv.parse(fs.readFileSync(".env.local", "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (pattern === value || pattern === `${key}=${value}`) return `.env.local value ${key}`;
  }
  return pattern;
}
