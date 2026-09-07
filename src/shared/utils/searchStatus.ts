export type SearchOperatorStatus =
  | 'completed'
  | 'cached'
  | 'no_results'
  | 'skipped'
  | 'failed'
  | 'all_filtered'
  | 'performing'
  | 'pending'
  | string;

/** Terminal statuses — search will not progress further for that operator. */
const TERMINAL_SEARCH_STATUSES = new Set<string>([
  'completed',
  'cached',
  'no_results',
  'skipped',
  'failed',
  'all_filtered',
]);

function normalizeStatus(status: SearchOperatorStatus): string {
  return String(status).trim().toLowerCase();
}

export function getReadySearchOperators(
  statusMap: Record<string, SearchOperatorStatus>,
): string[] {
  return Object.entries(statusMap)
    .filter(([, status]) => {
      const s = normalizeStatus(status);
      return s === 'completed' || s === 'cached';
    })
    .map(([id]) => id);
}

export function isAllOperatorsTerminal(
  statusMap: Record<string, SearchOperatorStatus>,
): boolean {
  const entries = Object.entries(statusMap);
  if (entries.length === 0) return false;
  return entries.every(([, status]) =>
    TERMINAL_SEARCH_STATUSES.has(normalizeStatus(status)),
  );
}

/**
 * True only when the search will not receive more operator results.
 * Use for hotel-details rooms so pending operators are not skipped.
 */
export function isSearchFullyComplete(
  statusMap: Record<string, SearchOperatorStatus>,
  completeness?: number,
): boolean {
  if (Number(completeness) >= 100) return true;
  return isAllOperatorsTerminal(statusMap);
}

/** HTTP statuses that mean the request_id is expired / invalid for LT. */
export function isStaleSearchRequestError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return (
    status === 400 ||
    status === 404 ||
    status === 410 ||
    status === 500 ||
    status === 502 ||
    status === 503
  );
}
