import Papa from "papaparse";

/** A problem with the uploaded file itself; the message is safe to show to the user. */
export class CsvError extends Error {}

/** Parses a CSV with a header row into trimmed string records. Strips the Excel BOM. */
export function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });
  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new CsvError(`CSV parse error on row ${first.row ?? "?"}: ${first.message}`);
  }
  return result.data;
}
