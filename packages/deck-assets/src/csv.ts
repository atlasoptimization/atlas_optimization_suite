import fs from "node:fs";
import Papa from "papaparse";
import type { CsvRow } from "./types";

export function parseCsv(file: string): CsvRow[] {
  const text = fs.readFileSync(file, "utf8");

  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    console.warn(`CSV warnings in ${file}:`);
    for (const err of parsed.errors.slice(0, 5)) {
      console.warn(`  line ${err.row}: ${err.message}`);
    }
  }

  return parsed.data;
}
