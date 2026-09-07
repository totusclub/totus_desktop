import type { HotelRoom, Offer } from '../../types/hotel';
import type { HotelRoomFilters, RoomFilterOption } from './roomFilters';
import { getOffersForDate } from './roomOffers';

export type AiRoomPick = {
  roomType?: string;
  mealType?: string;
  mealId?: string;
  roomId?: number | string;
  roomListingId?: number | string;
  offerId?: string;
  operatorId?: number | string;
  operatorName?: string;
  roomPrice?: number;
  startDate?: string;
  /**
   * When true, hotel rooms list hides non-matching meals (user selected filter_meals).
   * Card/AI highlight meal alone must not hide BB/RO/etc.
   */
  enforceMealFilter?: boolean;
};

export type AiPriceChange = {
  previousPrice: number;
  currentPrice: number;
  /** Positive = price went up, negative = price went down. */
  delta: number;
};

const MEAL_LABELS: Record<string, string> = {
  BB: 'Завтрак',
  RO: 'Без питания',
  AI: 'Всё включено',
  UAI: 'Ультра всё включено',
  HB: 'Завтрак и ужин',
  FB: 'Завтрак, обед, ужин',
  HBD: 'Завтрак и ужин',
  AI24: 'Всё включено 24 часа',
  DNR: 'Ужин',
  AIL: 'Всё включено с ограничениями',
  'FB+': 'Завтрак, обед, ужин +',
  'HB+': 'Завтрак и ужин +',
  HBL: 'Завтрак и обед',
};

function normalizePickId(value?: number | string | null): string | undefined {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function normalizeDateKey(dateValue?: string | null): string | null {
  if (!dateValue || typeof dateValue !== 'string') return null;
  const trimmed = dateValue.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return trimmed;
}

function getRoomIdentityIds(room: HotelRoom): string[] {
  return [room.room?.id, room.ID]
    .filter((value) => value != null)
    .map((value) => String(value));
}

function roomIdentityMatchesPick(room: HotelRoom, pick: AiRoomPick): boolean {
  const roomIds = getRoomIdentityIds(room);
  const typeId = normalizePickId(pick.roomId);
  const listingId = normalizePickId(pick.roomListingId);

  if (typeId && roomIds.includes(typeId)) return true;
  if (listingId && roomIds.includes(listingId)) return true;
  return false;
}

function roomNameMatchesPick(room: HotelRoom, pick: AiRoomPick): boolean {
  if (!pick.roomType) return false;

  const target = normalizeRoomName(pick.roomType);
  const names = [room.room?.name_ru, room.room?.name_en, room.room?.accommodation]
    .filter(Boolean)
    .map((name) => normalizeRoomName(name));

  return names.some((name) => {
    if (!name || !target) return false;
    if (name === target) return true;
    if (name.includes(target) || target.includes(name)) return true;

    const targetTokens = target.split(' ').filter(Boolean);
    const nameTokens = name.split(' ').filter(Boolean);
    if (!targetTokens.length || !nameTokens.length) return false;

    const matchedTokens = targetTokens.filter((token) =>
      nameTokens.some((nameToken) => nameToken.includes(token) || token.includes(nameToken)),
    );

    return matchedTokens.length >= Math.min(2, targetTokens.length);
  });
}

function getPriceTolerance(targetPrice?: number | null): number {
  if (!targetPrice || !Number.isFinite(targetPrice)) return 500;
  return Math.max(500, Math.round(targetPrice * 0.03));
}

function collectOfferCandidates(
  room: HotelRoom,
  pick: AiRoomPick,
  selectedDate: string | null,
): Array<{ mealId: string; offer: Offer }> {
  const mealIds = resolveMealIdsFromPick(pick);
  const targetDate = normalizeDateKey(pick.startDate) || normalizeDateKey(selectedDate);
  const dated: Array<{ mealId: string; offer: Offer }> = [];
  const all: Array<{ mealId: string; offer: Offer }> = [];

  Object.entries(room.offers ?? {}).forEach(([mealId, offerList]) => {
    if (mealIds.length && !mealIds.includes(mealId.toUpperCase())) return;

    (offerList ?? []).forEach((offer) => {
      all.push({ mealId, offer });
      if (!targetDate || normalizeDateKey(offer.start_date) === targetDate) {
        dated.push({ mealId, offer });
      }
    });
  });

  return dated.length ? dated : all;
}

function normalizeText(value?: string | null): string {
  if (!value) return '';
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeRoomName(value?: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zа-яё0-9\s+]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandMealIds(ids: string[]): string[] {
  const expanded = new Set(ids.map((id) => id.toUpperCase()));
  if (expanded.has('AI')) {
    expanded.add('UAI');
  }
  return Array.from(expanded);
}

const MEAL_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(MEAL_LABELS).map(([code, label]) => [normalizeText(label), code]),
);

/**
 * Normalize listing `filter_meals` (codes or option ids/names) → room meal codes (RO, AI, …).
 * Same as kedam_WEB — listing may send numeric meal option ids, not AI/BB codes.
 */
export function normalizeSearchMealsToRoomCodes(
  filterMeals: string | null | undefined,
  listingMealOptions?: Array<{
    id?: string | number | boolean;
    name?: string;
    selected?: boolean;
  }> | null,
): string[] {
  const rawParts = String(filterMeals ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const knownCodes = new Set(Object.keys(MEAL_LABELS));
  const optionById = new Map<
    string,
    { id?: string | number | boolean; name?: string }
  >();
  (listingMealOptions ?? []).forEach((option) => {
    if (option?.id != null) optionById.set(String(option.id), option);
    if (option?.name) optionById.set(normalizeText(option.name), option);
  });

  const resolved: string[] = [];
  const pushCode = (code: string) => {
    const upper = code.toUpperCase();
    if (!resolved.includes(upper)) resolved.push(upper);
  };

  rawParts.forEach((part) => {
    const upper = part.toUpperCase();
    if (knownCodes.has(upper)) {
      pushCode(upper);
      return;
    }

    const byId = optionById.get(part) || optionById.get(upper);
    if (byId) {
      const nameCode = byId.name ? MEAL_NAME_TO_CODE[normalizeText(byId.name)] : undefined;
      const idAsCode = String(byId.id ?? '').toUpperCase();
      if (nameCode) {
        pushCode(nameCode);
        return;
      }
      if (knownCodes.has(idAsCode)) {
        pushCode(idAsCode);
        return;
      }
    }

    const byName = MEAL_NAME_TO_CODE[normalizeText(part)];
    if (byName) {
      pushCode(byName);
      return;
    }

    for (const [code, label] of Object.entries(MEAL_LABELS)) {
      const normalizedLabel = normalizeText(label);
      const normalizedPart = normalizeText(part);
      if (
        normalizedPart &&
        (normalizedLabel === normalizedPart ||
          (normalizedPart.length >= 4 &&
            (normalizedLabel.includes(normalizedPart) || normalizedPart.includes(normalizedLabel))))
      ) {
        if (code === 'AI' && normalizedPart.includes('ультра')) continue;
        if (code === 'UAI' && normalizedPart === normalizeText(MEAL_LABELS.AI)) continue;
        pushCode(code);
        return;
      }
    }
  });

  if (!resolved.length && listingMealOptions?.length) {
    listingMealOptions
      .filter((option) => option.selected)
      .forEach((option) => {
        const idAsCode = String(option.id ?? '').toUpperCase();
        if (knownCodes.has(idAsCode)) {
          pushCode(idAsCode);
          return;
        }
        const nameCode = option.name ? MEAL_NAME_TO_CODE[normalizeText(option.name)] : undefined;
        if (nameCode) pushCode(nameCode);
      });
  }

  return resolved;
}

export function resolveMealIdsFromPick(pick: AiRoomPick | null | undefined): string[] {
  if (!pick) return [];

  const mealId = normalizePickId(pick.mealId);
  if (mealId) {
    return expandMealIds(
      mealId
        .split(',')
        .map((id) => id.trim().toUpperCase())
        .filter(Boolean),
    );
  }

  const mealLabel = normalizeText(pick.mealType);
  if (!mealLabel) return [];

  const ids = Object.entries(MEAL_LABELS)
    .filter(([, label]) => {
      const normalizedLabel = normalizeText(label);
      return (
        normalizedLabel === mealLabel ||
        normalizedLabel.includes(mealLabel) ||
        mealLabel.includes(normalizedLabel)
      );
    })
    .map(([id]) => id.toUpperCase());

  return expandMealIds(ids);
}

/** Exact meal ids from pick — no AI→UAI expansion (for room filter UI / meal-only list). */
export function resolveExactMealIdsFromPick(pick: AiRoomPick | null | undefined): string[] {
  if (!pick) return [];

  const mealId = normalizePickId(pick.mealId);
  if (mealId) {
    return mealId
      .split(',')
      .map((id) => id.trim().toUpperCase())
      .filter(Boolean);
  }

  const mealLabel = normalizeText(pick.mealType);
  if (!mealLabel) return [];

  return Object.entries(MEAL_LABELS)
    .filter(([, label]) => normalizeText(label) === mealLabel)
    .map(([id]) => id.toUpperCase());
}

/**
 * Keep only offers whose meal code is in `mealCodes` (e.g. AI, RO, BB).
 * Rooms with no matching offers are removed — same as kedam_WEB listRoomPick.
 */
export function filterRoomsByMealCodes(
  rooms: HotelRoom[],
  mealCodes: string[] | null | undefined,
): HotelRoom[] {
  if (!rooms?.length) return [];
  const mealSet = new Set(
    (mealCodes ?? []).map((code) => String(code).trim().toUpperCase()).filter(Boolean),
  );
  if (!mealSet.size) return rooms;

  return rooms
    .map((room) => {
      const filteredOffers: Record<string, Offer[]> = {};
      Object.entries(room.offers ?? {}).forEach(([mealId, offerList]) => {
        if (!mealSet.has(String(mealId).toUpperCase())) return;
        if (Array.isArray(offerList) && offerList.length) {
          filteredOffers[mealId] = offerList;
        }
      });
      if (!Object.keys(filteredOffers).length) return null;
      return { ...room, offers: filteredOffers };
    })
    .filter(Boolean) as HotelRoom[];
}

/** Build room pick from search-list hotel card + active filter_meals (kedam_WEB handoff). */
export function buildAiRoomPickFromSearchHotel(
  item: Record<string, unknown> | null | undefined,
  options?: {
    filterMeals?: string | null;
    filterOperators?: string | null;
    startDate?: string | null;
    listPrice?: number | null;
    listingMealOptions?: Array<{
      id?: string | number | boolean;
      name?: string;
      selected?: boolean;
    }> | null;
  },
): AiRoomPick | undefined {
  if (!item && !options?.filterMeals) return undefined;

  const nested = (item?.hotel as Record<string, unknown> | undefined) ?? {};
  const roomType =
    normalizePickId(item?.room_type as string) ||
    normalizePickId(nested.room_type as string);
  const mealType =
    normalizePickId(item?.meal_type as string) ||
    normalizePickId(nested.meal_type as string) ||
    normalizePickId(item?.meal_name as string);

  const mealCodesFromFilter = normalizeSearchMealsToRoomCodes(
    options?.filterMeals,
    options?.listingMealOptions,
  );

  // Only enforce meal filtering when the user selected meals in search filters.
  // Card meal (often AI as cheapest) is for highlight/sort — not for hiding other offers.
  const enforceMealFilter = mealCodesFromFilter.length > 0;
  const mealId = enforceMealFilter ? mealCodesFromFilter.join(',') : undefined;

  const roomId =
    normalizePickId(item?.room_id as string | number) ||
    normalizePickId(nested.room_id as string | number);
  const operatorId =
    normalizePickId(item?.operator_id as string | number) ||
    normalizePickId(options?.filterOperators?.split(',')[0]);
  const operatorName = normalizePickId(item?.operator_name as string);
  const roomPrice =
    options?.listPrice ??
    (item?.analytics_min_price != null
      ? Number(item.analytics_min_price)
      : item?.min_price != null
        ? Number(item.min_price)
        : undefined);

  if (!roomType && !mealType && !mealId && !roomId && !operatorId && !enforceMealFilter) {
    return undefined;
  }

  return {
    roomType,
    mealType,
    mealId,
    roomId,
    operatorId,
    operatorName,
    roomPrice: roomPrice != null && Number.isFinite(roomPrice) ? roomPrice : undefined,
    startDate: options?.startDate || undefined,
    enforceMealFilter,
  };
}

function resolveOperatorIdsFromPick(
  pick: AiRoomPick,
  operatorsOrCandidates?: RoomFilterOption[] | Array<{ offer: Offer }>,
): number[] {
  const operatorId = normalizePickId(pick.operatorId);
  if (operatorId) {
    return [Number(operatorId)].filter(Number.isFinite);
  }

  const operatorName = normalizeText(pick.operatorName);
  if (!operatorName || !operatorsOrCandidates?.length) {
    return [];
  }

  const firstItem = operatorsOrCandidates[0];
  if ('offer' in firstItem) {
    const ids = new Set<number>();
    (operatorsOrCandidates as Array<{ offer: Offer }>).forEach((item) => {
      const name = normalizeText(item.offer.operator_name);
      if (name === operatorName || name.includes(operatorName) || operatorName.includes(name)) {
        ids.add(Number(item.offer.operator_id));
      }
    });
    return Array.from(ids).filter(Number.isFinite);
  }

  return (operatorsOrCandidates as RoomFilterOption[])
    .filter((operator) => {
      const name = normalizeText(operator.name);
      return name === operatorName || name.includes(operatorName) || operatorName.includes(name);
    })
    .map((operator) => Number(operator.id))
    .filter(Number.isFinite);
}

export function isSameHotelRoom(
  left: HotelRoom | null | undefined,
  right: HotelRoom | null | undefined,
): boolean {
  if (!left || !right) return false;
  if (String(left.ID) === String(right.ID)) return true;

  const leftTypeId = left.room?.id != null ? String(left.room.id) : null;
  const rightTypeId = right.room?.id != null ? String(right.room.id) : null;

  return Boolean(leftTypeId && rightTypeId && leftTypeId === rightTypeId);
}

function pickBestOfferCandidate(
  candidates: Array<{ mealId: string; offer: Offer }>,
  pick: AiRoomPick,
): { mealId: string; offer: Offer } | null {
  if (!candidates.length) return null;

  const operatorIds = resolveOperatorIdsFromPick(pick, candidates);
  let pool = candidates;
  if (operatorIds.length) {
    const byOperator = candidates.filter((item) =>
      operatorIds.includes(Number(item.offer.operator_id)),
    );
    if (byOperator.length) {
      pool = byOperator;
    }
  }

  const offerId = normalizePickId(pick.offerId);
  if (offerId) {
    const byOfferId = pool.find((item) => String(item.offer.id) === offerId);
    if (byOfferId) return byOfferId;
  }

  if (pool.length === 1) {
    return pool[0];
  }

  const targetPrice = pick.roomPrice != null ? Math.round(Number(pick.roomPrice)) : null;

  if (targetPrice != null && pool.length > 0) {
    const exact = pool.find(
      (item) => Math.round(Number(item.offer.price)) === targetPrice,
    );
    if (exact) return exact;

    // Price may have changed since AI pick — keep same operator/meal, closest current price
    let closest: { mealId: string; offer: Offer } | null = null;
    let closestDiff = Number.POSITIVE_INFINITY;

    pool.forEach((item) => {
      const diff = Math.abs(Math.round(Number(item.offer.price)) - targetPrice);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = item;
      }
    });

    if (closest) return closest;
  }

  if (pool.length > 0) {
    return pool[0];
  }

  if (offerId) {
    const byOfferId = candidates.find((item) => String(item.offer.id) === offerId);
    if (byOfferId) return byOfferId;
  }

  if (targetPrice != null) {
    const exact = candidates.find(
      (item) => Math.round(Number(item.offer.price)) === targetPrice,
    );
    if (exact) return exact;
  }

  return candidates.length === 1 ? candidates[0] : null;
}

function scoreRoomForAiPick(
  room: HotelRoom,
  pick: AiRoomPick,
  selectedDate?: string | null,
): number {
  let score = 0;

  if (roomIdentityMatchesPick(room, pick)) {
    score += 1000;
  }

  if (roomNameMatchesPick(room, pick)) {
    score += 300;
  }

  const selectedOffer = pickBestOfferCandidate(
    collectOfferCandidates(room, pick, selectedDate ?? null),
    pick,
  );
  if (selectedOffer) {
    score += 200;
  }

  if (pick.roomPrice != null) {
    const candidates = collectOfferCandidates(room, pick, selectedDate ?? null);
    const prices = candidates.map((item) => Math.round(Number(item.offer.price)));
    if (prices.length) {
      const targetPrice = Math.round(Number(pick.roomPrice));
      const minDiff = Math.min(...prices.map((price) => Math.abs(price - targetPrice)));
      score += Math.max(0, 120 - Math.round(minDiff / 1000));
    }
  }

  return score;
}

export function resolveAiSelectedOffer(
  room: HotelRoom,
  pick: AiRoomPick | null | undefined,
  selectedDate: string | null,
): { mealId: string; offer: Offer } | null {
  if (!pick) return null;
  const candidates = collectOfferCandidates(room, pick, selectedDate);
  return pickBestOfferCandidate(candidates, pick);
}

export function resolveAiSelectedRoom(
  rooms: HotelRoom[],
  pick: AiRoomPick | null | undefined,
  selectedDate?: string | null,
): HotelRoom | null {
  if (!pick || !rooms.length) return null;

  const hasIdentity = Boolean(normalizePickId(pick.roomId) || normalizePickId(pick.roomListingId));
  if (hasIdentity) {
    const byIdentity = rooms.find((room) => roomIdentityMatchesPick(room, pick));
    if (byIdentity) return byIdentity;
  }

  let bestRoom: HotelRoom | null = null;
  let bestScore = 0;

  rooms.forEach((room) => {
    const score = scoreRoomForAiPick(room, pick, selectedDate);
    if (score > bestScore) {
      bestScore = score;
      bestRoom = room;
    }
  });

  if (!bestRoom) {
    return null;
  }

  if (roomIdentityMatchesPick(bestRoom, pick)) {
    return bestRoom;
  }

  if (bestScore < 500) {
    return null;
  }

  const nameMatches = rooms.filter((room) => roomNameMatchesPick(room, pick));
  if (nameMatches.length > 1 && pick.roomPrice != null) {
    const targetPrice = Math.round(Number(pick.roomPrice));
    const tolerance = getPriceTolerance(targetPrice);
    const priceMatches = nameMatches.filter((room) => {
      const candidates = collectOfferCandidates(room, pick, selectedDate ?? null);
      return candidates.some(
        (item) => Math.abs(Math.round(Number(item.offer.price)) - targetPrice) <= tolerance,
      );
    });

    if (priceMatches.length === 1) {
      return priceMatches[0];
    }
  }

  return bestRoom;
}

export function roomMatchesAiPick(room: HotelRoom, pick: AiRoomPick | null | undefined): boolean {
  if (!pick) return false;
  return roomIdentityMatchesPick(room, pick) || roomNameMatchesPick(room, pick);
}

export function findBestMatchingRoom(
  rooms: HotelRoom[],
  pick: AiRoomPick | null | undefined,
  selectedDate?: string | null,
): HotelRoom | null {
  return resolveAiSelectedRoom(rooms, pick, selectedDate);
}

export function getOffersForAiPickRoom(
  room: HotelRoom,
  selectedDate: string | null,
  pick: AiRoomPick | null | undefined,
  searchNights?: number | null,
): Offer[] {
  const selectedOffer = resolveAiSelectedOffer(room, pick, selectedDate);
  return selectedOffer
    ? [selectedOffer.offer]
    : getOffersForDate(room, selectedDate, searchNights);
}

function mealIdMatchesPick(mealId: string, pick: AiRoomPick | null | undefined, room?: HotelRoom): boolean {
  if (!pick) return false;

  const normalizedMealId = mealId.toUpperCase();
  const mealIds = resolveMealIdsFromPick(pick);
  if (mealIds.length) {
    return mealIds.includes(normalizedMealId);
  }

  const mealLabel = normalizeText(pick.mealType);
  if (!mealLabel) return false;

  const mealType = room?.meal_types?.find((item) => item.id === mealId);
  const labels = [
    mealType?.description,
    MEAL_LABELS[mealId],
    mealId,
  ]
    .filter(Boolean)
    .map((label) => normalizeText(String(label)));

  return labels.some((label) => label === mealLabel || label.includes(mealLabel));
}

export function resolveAiPriceChange(
  pick: AiRoomPick | null | undefined,
  currentOffer: Offer | null | undefined,
): AiPriceChange | null {
  if (!pick?.roomPrice || !currentOffer?.price) {
    return null;
  }

  const previousPrice = Math.round(Number(pick.roomPrice));
  const currentPrice = Math.round(Number(currentOffer.price));

  if (!Number.isFinite(previousPrice) || !Number.isFinite(currentPrice)) {
    return null;
  }

  if (currentPrice === previousPrice) {
    return null;
  }

  return {
    previousPrice,
    currentPrice,
    delta: currentPrice - previousPrice,
  };
}

export function formatAiPriceChangeAmount(delta: number): string {
  return Math.abs(delta).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function getAiPriceChangeLabel(change: AiPriceChange): string {
  const amount = formatAiPriceChangeAmount(change.delta);
  if (change.delta > 0) {
    return `+${amount} ₽ с момента AI-подбора`;
  }
  return `−${amount} ₽ с момента AI-подбора`;
}

export function enrichAiRoomPickFromRooms(
  pick: AiRoomPick | null | undefined,
  rooms: HotelRoom[],
  selectedDate?: string | null,
): AiRoomPick | null | undefined {
  if (!pick) return pick;

  const room = resolveAiSelectedRoom(rooms, pick, selectedDate ?? null);
  if (!room) return pick;

  const resolved = resolveAiSelectedOffer(room, pick, selectedDate ?? null);
  if (!resolved) {
    return pick;
  }

  return {
    ...pick,
    operatorId: pick.operatorId ?? resolved.offer.operator_id,
    operatorName: pick.operatorName ?? resolved.offer.operator_name,
    mealId: pick.mealId || (pick.enforceMealFilter ? resolved.mealId : undefined),
    offerId: pick.offerId || String(resolved.offer.id),
    enforceMealFilter: pick.enforceMealFilter,
  };
}

export function applyAiPickToRoomFilters(
  filters: HotelRoomFilters | null,
  pick: AiRoomPick | null | undefined,
): HotelRoomFilters | null {
  if (!filters || !pick) return filters;

  let next = filters;

  // Only pre-select meal checkboxes when user explicitly filtered by meal in search.
  const mealIds = pick.enforceMealFilter
    ? Array.from(
        new Set([
          ...resolveExactMealIdsFromPick({ mealId: pick.mealId }),
          ...normalizeSearchMealsToRoomCodes(pick.mealId, next.meals ?? null),
        ]),
      )
    : [];
  const mealIdSet = new Set(mealIds);
  const mealLabel = normalizeText(pick.mealType);

  if (mealIds.length) {
    const existing = next.meals ?? [];
    const coveredCodes = new Set(
      existing.flatMap((meal) => {
        const idUpper = String(meal.id ?? '').toUpperCase();
        const codes: string[] = [];
        if (idUpper && MEAL_LABELS[idUpper]) codes.push(idUpper);
        const name = meal.name ? String(meal.name).trim() : '';
        if (name) {
          const nameAsCode = name.toUpperCase();
          if (MEAL_LABELS[nameAsCode]) codes.push(nameAsCode);
          const fromLabel = MEAL_NAME_TO_CODE[normalizeText(name)];
          if (fromLabel) codes.push(fromLabel);
        }
        return codes;
      }),
    );

    const injected: RoomFilterOption[] = mealIds
      .filter((id) => !coveredCodes.has(id))
      .map((id) => ({
        id,
        name: MEAL_LABELS[id] || id,
        selected: true,
        disabled: false,
      }));

    const mealsBase = [...existing, ...injected];
    next = {
      ...next,
      meals: mealsBase.map((meal) => {
        const idUpper = String(meal.id).toUpperCase();
        const optionCodes: string[] = [];
        if (idUpper && MEAL_LABELS[idUpper]) optionCodes.push(idUpper);
        const name = meal.name ? String(meal.name).trim() : '';
        if (name) {
          const fromLabel = MEAL_NAME_TO_CODE[normalizeText(name)];
          if (fromLabel) optionCodes.push(fromLabel);
        }
        const matches =
          mealIdSet.has(idUpper) ||
          optionCodes.some((code) => mealIdSet.has(code)) ||
          (mealIds.length === 1 && mealLabel && normalizeText(meal.name) === mealLabel);

        return matches
          ? { ...meal, selected: true, disabled: false }
          : { ...meal, selected: false };
      }),
    };
  }

  const operatorIds = resolveOperatorIdsFromPick(pick, next.operators);
  if (operatorIds.length && next.operators?.length) {
    next = {
      ...next,
      operators: next.operators.map((operator) => ({
        ...operator,
        selected: operatorIds.includes(Number(operator.id)),
      })),
    };
  }

  return next;
}

export function isMealSectionHighlightedByAiPick(
  mealTypeId: string,
  pick: AiRoomPick | null | undefined,
  room: HotelRoom,
): boolean {
  if (!pick) return false;
  if (!roomMatchesAiPick(room, pick)) return false;
  return mealIdMatchesPick(mealTypeId, pick, room);
}

export function isOfferHighlightedByAiPick(
  offer: Offer,
  mealTypeId: string,
  pick: AiRoomPick | null | undefined,
  selectedDate: string | null | undefined,
  room: HotelRoom,
): boolean {
  const selectedOffer = resolveAiSelectedOffer(room, pick, selectedDate ?? null);
  if (!selectedOffer) return false;

  return (
    selectedOffer.mealId.toUpperCase() === mealTypeId.toUpperCase() &&
    selectedOffer.offer.id === offer.id &&
    selectedOffer.offer.operator_id === offer.operator_id
  );
}

export function sortRoomsWithAiPickFirst(
  rooms: HotelRoom[],
  pick: AiRoomPick | null | undefined,
  selectedDate?: string | null,
): HotelRoom[] {
  if (!pick || !rooms.length) return rooms;

  const matchedRoom = resolveAiSelectedRoom(rooms, pick, selectedDate);
  if (!matchedRoom) return rooms;

  const matchedId = String(matchedRoom.ID);
  const matched: HotelRoom[] = [];
  const others: HotelRoom[] = [];

  rooms.forEach((room) => {
    if (String(room.ID) === matchedId) {
      matched.push(room);
    } else {
      others.push(room);
    }
  });

  return [...matched, ...others];
}
