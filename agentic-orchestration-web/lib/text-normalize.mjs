/** @param {string} text */
export function stripWrappingQuotes(text) {
  let t = String(text ?? "").trim();
  if (t.length < 2) return t;
  const pairs = [
    ['"', '"'],
    ["'", "'"],
    ["\u201c", "\u201d"],
    ["\u2018", "\u2019"],
  ];
  for (const [open, close] of pairs) {
    if (t.startsWith(open) && t.endsWith(close)) {
      t = t.slice(open.length, -close.length).trim();
      break;
    }
  }
  return t;
}
