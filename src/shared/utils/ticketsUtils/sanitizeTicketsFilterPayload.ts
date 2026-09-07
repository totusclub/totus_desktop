import { buildFilterSections } from './filterSections';

/** Filter groups the API accepts but that are not rendered as chip sections. */
const EXTRA_FILTER_KEYS = ['confirmability'] as const;

/** Normalize selections to Record<sectionId, non-empty string[]>. */
export function normalizeTicketsFilterSelections(
  selections: Record<string, unknown> | undefined | null,
): Record<string, string[]> {
  if (!selections || typeof selections !== 'object') {
    return {};
  }
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(selections)) {
    if (!Array.isArray(raw)) {
      continue;
    }
    const strings = [
      ...new Set(
        raw
          .map(v => (v == null ? '' : String(v).trim()))
          .filter(v => v.length > 0),
      ),
    ];
    if (strings.length > 0) {
      out[key] = strings;
    }
  }
  return out;
}

/**
 * Keep only selections that appear in current filter metadata from the API.
 * Prevents stale/invalid filter values from being POSTed to /packages/flights
 * (LT returns 500 "Failed to start search").
 */
export function sanitizeTicketsFilterPayload(
  filtersMeta: unknown,
  selections: Record<string, unknown> | undefined,
): Record<string, string[]> {
  const normalized = normalizeTicketsFilterSelections(selections);
  if (!filtersMeta || Object.keys(normalized).length === 0) {
    return {};
  }

  const sections = buildFilterSections(filtersMeta as any);
  const allowedBySection: Record<string, Set<string>> = {};

  for (const section of sections) {
    allowedBySection[section.id] = new Set(
      section.options.map(o => o.id).filter(id => id != null && id !== ''),
    );
  }

  const meta = filtersMeta as Record<string, unknown>;
  for (const key of EXTRA_FILTER_KEYS) {
    const items = meta?.[key];
    if (!Array.isArray(items) || items.length === 0) {
      continue;
    }
    allowedBySection[key] = new Set(
      items
        .map((item: any) => (item?.id == null ? '' : String(item.id)))
        .filter(id => id !== ''),
    );
  }

  const out: Record<string, string[]> = {};

  for (const [key, values] of Object.entries(normalized)) {
    const allowed = allowedBySection[key];
    if (!allowed || allowed.size === 0) {
      // Keys the API supports but doesn't advertise (e.g. confirmability on
      // some responses) must still reach the request — kedam-WEB sends them.
      if ((EXTRA_FILTER_KEYS as readonly string[]).includes(key)) {
        out[key] = values;
      }
      continue;
    }
    const kept = [...new Set(values.map(String))].filter(
      v => v.length > 0 && allowed.has(v),
    );
    if (kept.length > 0) {
      out[key] = kept;
    }
  }

  return out;
}

/**
 * kedam-WEB `onChangeFilters` posts integer ids as numbers (`operators: [7]`)
 * and keeps non-numeric ids as strings (`luggage_types: ['hold']`).
 */
export function coerceTicketsFilterPayload(
  selections: Record<string, string[]>,
): Record<string, Array<string | number>> {
  const out: Record<string, Array<string | number>> = {};

  for (const [key, values] of Object.entries(selections)) {
    const coerced = values
      .filter(value => value !== '' && value !== '...')
      .map(value => (/^-?\d+$/.test(value) ? Number(value) : value));
    if (coerced.length > 0) {
      out[key] = coerced;
    }
  }

  return out;
}
