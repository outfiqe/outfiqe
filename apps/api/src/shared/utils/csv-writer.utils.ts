const SPREADSHEET_FORMULA_START = /^[=+\-@\t\r]/;
const FORMULA_NEUTRALIZING_PREFIX = "'";

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

const neutralizeSpreadsheetFormula = (text: string): string =>
  SPREADSHEET_FORMULA_START.test(text) ? `${FORMULA_NEUTRALIZING_PREFIX}${text}` : text;

export const toCsvField = (value: string | number | null): string => {
  if (typeof value === "number") return String(value);
  const text = neutralizeSpreadsheetFormula(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (headers: string[], rows: (string | number | null)[][]): string =>
  [headers, ...rows].map((row) => row.map(toCsvField).join(",")).join("\r\n");
