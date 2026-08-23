// `z.coerce.number()` accepts anything on the way in, so react-hook-form types
// those fields as `unknown` — which is honest: at the moment the select renders,
// nothing has proven the value is a number yet.
//
// Every select in the app then has to turn that value into the string the
// component expects, and `String(unknown)` would quietly render "[object
// Object]" if the shape ever changed. This narrows first and returns the empty
// string for anything that has no sensible textual form, which is exactly what
// a select needs to show "nothing selected".
export function toSelectValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return String(value);
  return "";
}
