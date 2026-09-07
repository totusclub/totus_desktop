import { HotelRoom, Offer, MealType } from './index';

export type DateOption = {
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  minPrice: number;
};

export type OffersByMealType = {
  [mealTypeId: string]: {
    mealType: MealType;
    offers: Offer[];
  };
};

