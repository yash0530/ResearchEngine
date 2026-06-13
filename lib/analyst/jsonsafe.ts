// Weak local models wrap JSON in prose or fences; this absorbs it.

/** Parse strict JSON; else the substring between the first '{' and last '}'. Null if hopeless. */
export function jsonsafe(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
}
