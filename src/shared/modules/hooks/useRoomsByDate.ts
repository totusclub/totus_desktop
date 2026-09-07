import { useMemo, useEffect, useState } from 'react';
import { extractDateOptions, filterRoomsByDate } from '../../utils/hotelUtils/roomHelpers';
import type { HotelRoom } from '../../types/hotel';

/**
 * Room date selection — match kedam-WEB hotel details:
 * prefer search start_date when present in offer dates; exact nights only.
 */
export const useRoomsByDate = (
  rooms: HotelRoom[],
  initialSelectedDate?: string | null,
  searchNights?: number | null,
) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialSelectedDate ?? null,
  );

  const dateOptions = useMemo(
    () => extractDateOptions(rooms, searchNights, initialSelectedDate),
    [rooms, searchNights, initialSelectedDate],
  );

  useEffect(() => {
    if (!dateOptions.length) {
      setSelectedDate(null);
      return;
    }

    const dateIds = dateOptions.map((option) => option.date);

    setSelectedDate((prev) => {
      // Prefer search departure date when it exists in offer dates.
      if (initialSelectedDate && dateIds.includes(initialSelectedDate)) {
        return initialSelectedDate;
      }
      if (prev && dateIds.includes(prev)) {
        return prev;
      }
      return dateOptions[0].date;
    });
  }, [dateOptions, initialSelectedDate]);

  const filteredRooms = useMemo(
    () => filterRoomsByDate(rooms, selectedDate, searchNights),
    [rooms, selectedDate, searchNights],
  );

  return { selectedDate, setSelectedDate, dateOptions, filteredRooms };
};
