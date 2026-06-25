import { slugify } from "./slugify";
import type { CsvRow } from "./types";

export function getField(row: CsvRow, possibleNames: string[], fallback = ""): string {
  const normalized = new Map<string, string>();
  for (const key of Object.keys(row)) {
    normalized.set(slugify(key), key);
  }

  for (const name of possibleNames) {
    const direct = row[name];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return String(direct).trim();
    }

    const key = normalized.get(slugify(name));
    if (key && row[key] !== undefined && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }

  return fallback;
}
