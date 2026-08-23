// Strips diacritics and case so "nomina" matches "Nómina". Spanish text gets
// typed without accents far more often than with them, and every place that
// compares user-typed text against stored text — search, CSV lookups,
// categorisation rules — has to agree on what "the same" means.
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

// Tag names are stored one per row but read back as a single aggregated string;
// this is the only place that knows how to take them apart again.
export function splitTagNames(value: string | null): string[] {
  if (value === null || value.trim() === "") return [];
  return value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "")
    .sort((a, b) => a.localeCompare(b, "es"));
}

// Commas separate tags in both the aggregated column and the tag input, so a
// name containing one would be indistinguishable from two names.
export function isValidTagName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 40 && !trimmed.includes(",");
}
