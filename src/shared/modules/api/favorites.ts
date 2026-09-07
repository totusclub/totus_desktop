// Favorites API — same contract as kedam-WEB (`favoritesApi.ts`),
// backed by voip server `/api/favorites` routes.

import { VOIP_BASE_URL } from '../../config/server';
import { voipFetch } from './voipAuth';

const BASE_URL = VOIP_BASE_URL;

export interface Favorite {
  id: number;
  hotelId: number;
  hotelData: any;
  createdAt: string;
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /network request failed|failed to fetch|networkerror/i.test(message);
}

// Add a hotel to favorites
export async function addFavorite(
  userId: number,
  hotelId: number,
  hotelData: any,
): Promise<Favorite> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        hotelId,
        hotelData,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: string }).error ||
          `Failed to add favorite: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.favorite;
  } catch (error) {
    if (!isNetworkError(error)) {
      console.warn('Error adding favorite:', error);
    }
    throw error;
  }
}

// Remove a hotel from favorites
export async function removeFavorite(
  userId: number,
  hotelId: number,
): Promise<boolean> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/favorites`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        hotelId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: string }).error ||
          `Failed to remove favorite: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.deleted;
  } catch (error) {
    if (!isNetworkError(error)) {
      console.warn('Error removing favorite:', error);
    }
    throw error;
  }
}

// Get user's favorites
export async function getUserFavorites(userId: number): Promise<Favorite[]> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/favorites/${userId}`);
    if (!response.ok) {
      // If 404, return empty array (no favorites yet)
      if (response.status === 404) {
        return [];
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error ||
          `Failed to fetch favorites: ${response.status}`,
      );
    }
    const data = await response.json();
    return data.favorites || [];
  } catch (error) {
    if (!isNetworkError(error)) {
      console.warn('Error fetching favorites:', error);
    }
    throw error;
  }
}

// Check if hotel is favorited
export async function isFavorite(
  userId: number,
  hotelId: number,
): Promise<boolean> {
  try {
    const response = await voipFetch(
      `${BASE_URL}/api/favorites/${userId}/${hotelId}`,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      throw new Error(`Failed to check favorite: ${response.status}`);
    }
    const data = await response.json();
    return Boolean(data.isFavorite);
  } catch (error) {
    // Recoverable — treat as not favorited; avoid console.error (RN LogBox).
    if (__DEV__ && !isNetworkError(error)) {
      console.warn('Error checking favorite:', error);
    }
    return false;
  }
}
