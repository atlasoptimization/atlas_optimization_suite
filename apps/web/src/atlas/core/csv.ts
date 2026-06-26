import type { AtlasCsvData } from "./types";

export type ParsedAtlasCsv = AtlasCsvData & {
  rows: Record<string, string>[];
};

export function parseAtlasCsv(text: string, fileName = "data.csv"): ParsedAtlasCsv {
  const rows = parseRows(text);
  const columns = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));
  const records = dataRows.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""]))
  );

  return {
    fileName,
    columns,
    rowCount: records.length,
    rows: records,
    previewRows: records.slice(0, 5)
  };
}

export function dataColumnDiagnostics(data: AtlasCsvData | undefined, column: string) {
  if (!data) return [`Data source is missing for column "${column}".`];
  if (!data.columns.includes(column)) return [`Column "${column}" was not found in ${data.fileName}.`];
  return [];
}

function parseRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  rows.push(row);
  return rows.filter((candidate) => candidate.some((cellValue) => cellValue.length > 0));
}
