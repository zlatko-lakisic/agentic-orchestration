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

const INSTRUCTION_ECHO_CUES = [
  "you have to",
  "you must",
  "skip all the previous",
  "requirements",
  "delivery format",
  "plain natural language",
  "according to all that was provided",
  "simply use plain text",
  "the final answer is",
  "write the user-facing",
  "do not use json",
  "no meta-commentary",
  "[agentic:",
];

/** @param {string} text */
function looksLikeInstructionEcho(text) {
  const t = String(text ?? "").trim().toLowerCase();
  if (!t) return false;
  let hits = 0;
  for (const cue of INSTRUCTION_ECHO_CUES) {
    if (t.includes(cue)) hits += 1;
  }
  if (hits >= 2) return true;
  if (hits >= 1 && (t.includes("final answer") || t.length < 420)) return true;
  return false;
}

/** @param {string} text */
function stripLeadingInstructionParagraphs(text) {
  const parts = String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  while (parts.length && looksLikeInstructionEcho(parts[0])) {
    parts.shift();
  }
  return parts.join("\n\n").trim();
}

/** @param {string} text */
export function sanitizeUserFacingProse(text) {
  let t = String(text ?? "").trim();
  if (!t) return t;

  const boxedRe = /(?:\$)?\\boxed\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}(?:\$)?/gs;
  const matches = [...t.matchAll(boxedRe)];
  if (matches.length) {
    const last = matches[matches.length - 1];
    const inner = String(last[1] ?? "").trim();
    const prefix = t.slice(0, last.index).trim();
    const suffix = t.slice(last.index + last[0].length).trim();
    if (inner && (!suffix || looksLikeInstructionEcho(suffix))) {
      if (!prefix || looksLikeInstructionEcho(prefix) || /^the\s+final answer\s+is\s*:?\s*$/i.test(prefix)) {
        t = inner;
      } else {
        t = `${prefix}\n\n${inner}`.trim();
      }
    }
    t = t.replace(boxedRe, (_, inner) => String(inner ?? "").trim());
  }

  t = t.replace(/\[Delivery format:[^\]]*\]/gi, "");
  t = t.replace(/\[agentic:[^\]]*\]/gi, "");
  t = t.replace(/^(?:the\s+)?final answer\s+is\s*:?\s*/gim, "");
  t = stripLeadingInstructionParagraphs(t);
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return stripWrappingQuotes(t);
}
