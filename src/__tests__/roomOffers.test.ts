import { describe, expect, it } from 'vitest';

// Room Type v3 (CUSTOM_ROOMS_API.md, раздел 2.2): один номер LT, внутри две группы предложений —
// «Arlekino» (наши offers, `lt_extras.totus.custom === true`, operator_id 990000+) и «Level.Travel»
// (оригинальные offers LT). Группировка только по метке, ничего не дедуплицируется.
import {
  ARLEKINO_OPERATOR_ID_BASE,
  OFFER_GROUP_ORDER,
  flattenRoomOffers,
  getOfferSource,
  isArlekinoOffer,
  isArlekinoOperatorId,
  minOfferPrice,
  roomHasArlekinoOffers,
  splitOffersBySource,
} from '../shared/utils/roomOffers';
import {
  buildHotelRoomsQueryParams,
  buildOperatorsFilterFromRooms,
  filterRoomsByFilters,
} from '../shared/utils/hotelUtils/roomFilters';

// Срез реального ответа /hotels-rooms (Rixos Premium Seagate, номер 101879, fixed 1 ₽):
// наше предложение первым в offers.UAI, за ним оригиналы LT.
const arlekinoOffer = {
  id: 't1-1-sfcrrn',
  nights_count: 7,
  price: 1,
  analytics_price: 1,
  operator_id: 990001,
  operator_name: 'Arlekino',
  start_date: '2026-09-29',
  lt_extras: {
    totus: { custom: true, roomTypeId: 1, sourceOfferId: '078-4a3340af5bd0fdf50d0272286c4773a4', meal: 'UAI', mode: 'fixed', source: 'arlekino' },
  },
  extras: { cheap: false, instant_confirm: true, best_price: false, surcharge: 0, cancellation_policy: null },
};

const ltOffer = (id: string, operatorId: number, operatorName: string, price: number) => ({
  id,
  nights_count: 7,
  price,
  analytics_price: price,
  operator_id: operatorId,
  operator_name: operatorName,
  start_date: '2026-09-29',
  lt_extras: null,
  extras: { cheap: false, instant_confirm: true, best_price: false, surcharge: 0, cancellation_policy: null },
});

const room = {
  ID: '13705',
  min_price: 1,
  room: { id: 101879, name_ru: 'Улучшенный номер Aqua' },
  meal_types: [{ id: 'UAI', min_price: 1, description: 'Ультра всё включено' }],
  lt_extras: { totus: { roomTypeId: 1, customOffers: 1, sourceRoomId: 101879 } },
  offers: {
    UAI: [
      arlekinoOffer,
      ltOffer('078-4a3340af5bd0fdf50d0272286c4773a4', 78, 'Level.Travel', 258996),
      ltOffer('005-biblio', 5, 'Biblio Globus', 273157),
      ltOffer('002-anex', 2, 'Anex Tour', 261000),
    ],
  },
};

const ltOnlyRoom = {
  ID: '13706',
  min_price: 300000,
  room: { id: 101880, name_ru: 'Стандарт' },
  meal_types: [{ id: 'AI', min_price: 300000, description: 'Всё включено' }],
  lt_extras: null,
  offers: { AI: [ltOffer('078-std', 78, 'Level.Travel', 300000)] },
};

describe('roomOffers: метка Arlekino', () => {
  it('источник — только по lt_extras.totus.custom, не по id/оператору', () => {
    expect(isArlekinoOffer(arlekinoOffer)).toBe(true);
    expect(isArlekinoOffer(ltOffer('t-fake', 990002, 'Arlekino', 5))).toBe(false);
    expect(isArlekinoOffer(null)).toBe(false);
    expect(getOfferSource(arlekinoOffer)).toBe('arlekino');
    expect(getOfferSource(room.offers.UAI[1])).toBe('levelTravel');
    expect(OFFER_GROUP_ORDER).toEqual(['arlekino', 'levelTravel']);
  });

  it('operator_id ≥ 990000 — наш оператор', () => {
    expect(isArlekinoOperatorId(990001)).toBe(true);
    expect(isArlekinoOperatorId('990010')).toBe(true);
    expect(isArlekinoOperatorId(78)).toBe(false);
    expect(isArlekinoOperatorId(undefined)).toBe(false);
  });
});

describe('roomOffers: группировка и цена', () => {
  it('делит на две группы, внутри каждой сортировка по цене, ничего не теряет', () => {
    const groups = splitOffersBySource(room.offers.UAI);
    expect(groups.arlekino.map((o) => o.id)).toEqual(['t1-1-sfcrrn']);
    expect(groups.levelTravel.map((o) => o.price)).toEqual([258996, 261000, 273157]);
    expect(groups.arlekino.length + groups.levelTravel.length).toBe(room.offers.UAI.length);
  });

  it('пустая группа Arlekino у обычного номера LT', () => {
    const groups = splitOffersBySource(ltOnlyRoom.offers.AI);
    expect(groups.arlekino).toEqual([]);
    expect(groups.levelTravel).toHaveLength(1);
    expect(roomHasArlekinoOffers(ltOnlyRoom)).toBe(false);
    expect(roomHasArlekinoOffers(room)).toBe(true);
  });

  it('«от» — минимум по всем предложениям номера (Arlekino 1 ₽ → 1)', () => {
    expect(minOfferPrice(flattenRoomOffers(room))).toBe(1);
    expect(minOfferPrice(splitOffersBySource(room.offers.UAI).levelTravel)).toBe(258996);
    expect(minOfferPrice([])).toBeNull();
  });
});

describe('roomFilters: оператор «Arlekino»', () => {
  const rooms = [room, ltOnlyRoom];

  it('все наши operator_id (990000+) — один пункт «Arlekino» в фильтре', () => {
    const secondRoomType = { ...arlekinoOffer, id: 't2-1-x', operator_id: 990002, price: 5, analytics_price: 5 };
    const operators = buildOperatorsFilterFromRooms([
      { ...room, offers: { UAI: [...room.offers.UAI, secondRoomType] } },
      ltOnlyRoom,
    ]);
    const arlekino = operators.filter((o) => o.name === 'Arlekino');
    expect(arlekino).toHaveLength(1);
    expect(arlekino[0].id).toBe(ARLEKINO_OPERATOR_ID_BASE);
    expect(arlekino[0].count).toBe(2);
    expect(arlekino[0].min_price).toBe(1);
    expect(operators.map((o) => o.name)).toContain('Level.Travel');
  });

  it('выбранный «Arlekino» фильтрует на клиенте и не уходит в /hotels-rooms?operators=', () => {
    const filters = {
      operators: [
        { id: ARLEKINO_OPERATOR_ID_BASE, name: 'Arlekino', selected: true },
        { id: 78, name: 'Level.Travel', selected: false },
      ],
    };
    expect(buildHotelRoomsQueryParams(filters)).toEqual({});

    const filtered = filterRoomsByFilters(rooms, filters) as Array<typeof room>;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].offers.UAI.map((o) => o.id)).toEqual(['t1-1-sfcrrn']);

    const both = buildHotelRoomsQueryParams({
      operators: [
        { id: ARLEKINO_OPERATOR_ID_BASE, name: 'Arlekino', selected: true },
        { id: 78, name: 'Level.Travel', selected: true },
      ],
    });
    expect(both.operators).toBe('78');
  });

  it('наши offers проходят фильтры по подтверждению вместе с LT', () => {
    const filtered = filterRoomsByFilters(rooms, {
      confirmability: [{ id: 1, name: 'Моментальное подтверждение', selected: true }],
    }) as Array<typeof room>;
    expect(filtered[0].offers.UAI).toHaveLength(4);
    expect(isArlekinoOffer(filtered[0].offers.UAI[0])).toBe(true);
  });
});
