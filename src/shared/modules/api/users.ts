// API service for fetching users from VoIP backend

import {VOIP_BASE_URL} from '../../config/server';
import {voipFetch} from './voipAuth';

const BASE_URL = VOIP_BASE_URL;

export interface User {
  id: number;
  loyaltyId: string;
  name: string | null;
  fName: string | null;
  lName: string | null;
  email: string | null;
  phone: string | null;
  online: boolean;
  hasVoipToken: boolean;
  hasSocket: boolean;
  /** 0 = show AI & Calling tabs, 1 = hide */
  access?: 0 | 1 | boolean | null;
}

// Get all users from database
export async function getAllUsers(): Promise<User[]> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/users`);
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.warn('Error fetching users:', error);
    return [];
  }
}

// Get user by loyalty_id
export async function getUserByLoyaltyId(loyaltyId: string): Promise<User | null> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/users/${loyaltyId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.warn('Error fetching user:', error);
    return null;
  }
}

// Get user by ID
export async function getUserById(userId: number): Promise<User | null> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/users/by-id/${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    const data = await response.json();
    return data.user || null;
  } catch (error) {
    // Network failures should not crash UI / LogBox — callers treat null as missing user
    console.warn('Error fetching user by ID:', error);
    return null;
  }
}

// Format user display name
export function getUserDisplayName(user: User): string {
  if (user.name) {
    return user.name;
  }
  if (user.fName || user.lName) {
    return [user.fName, user.lName].filter(Boolean).join(' ');
  }
  if (user.email) {
    return user.email;
  }
  if (user.phone) {
    return user.phone;
  }
  return `User ${user.loyaltyId}`;
}
