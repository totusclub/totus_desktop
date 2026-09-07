import { describe, expect, it, vi } from 'vitest';

// Мила → экран отеля: та же логика разбора ссылок, что в мобильном приложении (utils/aiAssistantOpenHotel).
vi.mock('@tosmedia/ai-assistant', () => ({
  useAssistantStore: { getState: () => ({ setOpen: () => undefined }) },
}));

import { parseAiHotelUrl, setAiHotelNavigator, openHotelFromAiAssistantUrl, openHotelFromAiAssistantInfo } from '../shared/utils/aiAssistantOpenHotel';

describe('parseAiHotelUrl', () => {
  it('разбирает ссылку hotel-details с параметрами (как с сайта)', () => {
    const p = parseAiHotelUrl('https://totus.club/hotel-details?hotel_id=9223758&from_city=Moscow&adults=2&kids=1&kids_ages=3&start_date=2026-08-01&nights=7&room_type=Standard');
    expect(p?.hotelId).toBe('9223758');
    expect(p?.roomType).toBe('Standard');
    expect(p?.query.singles.from_city).toBe('Moscow');
    expect(p?.query.kidsAges).toEqual([3]);
  });
  it('разбирает /hotel-details/lt_<id>?room=', () => {
    const p = parseAiHotelUrl('/hotel-details/lt_123456?room=Deluxe');
    expect(p?.hotelId).toBe('123456');
    expect(p?.roomType).toBe('Deluxe');
  });
  it('не принимает нечисловой id', () => {
    expect(parseAiHotelUrl('/hotel-details/abc')).toBeNull();
  });
});

describe('openHotelFromAiAssistant*', () => {
  it('передаёт навигатору hotel_ids, flex_dates=0 и roomType', () => {
    const navigate = vi.fn();
    setAiHotelNavigator(navigate);
    expect(openHotelFromAiAssistantUrl('/hotel-details?hotel_id=555&start_date=2026-09-11&nights=7&adults=2&room_type=Family')).toBe(true);
    const params = navigate.mock.calls[0][0];
    expect(params.hotelId).toBe('555');
    expect(params.searchParams.hotel_ids).toEqual([555]);
    expect(params.searchParams.flex_dates).toBe(0);
    expect(params.searchParams.start_date).toBe('2026-09-11');
    expect(params.aiRoomPick).toEqual({ roomType: 'Family' });
    expect(openHotelFromAiAssistantInfo({ hotelId: '777', roomType: 'Suite' })).toBe(true);
    expect(navigate.mock.calls[1][0].hotelId).toBe('777');
    setAiHotelNavigator(null);
  });
});
