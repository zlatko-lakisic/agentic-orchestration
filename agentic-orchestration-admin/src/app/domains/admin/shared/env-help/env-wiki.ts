/** GitHub wiki base for AO documentation. */
export const WIKI_BASE_URL =
  'https://github.com/zlatko-lakisic/agentic-orchestration/wiki';

/** Default page that hosts per-variable HTML anchors (`#AGENTIC_KB`). */
export const WIKI_CONFIG_PAGE = 'Configuration';

export function wikiUrlForKey(
  key: string,
  page: string = WIKI_CONFIG_PAGE
): string {
  const k = String(key || '').trim();
  if (!k) return `${WIKI_BASE_URL}/${page}`;
  return `${WIKI_BASE_URL}/${page}#${k}`;
}
