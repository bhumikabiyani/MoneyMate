import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: '🍔' },
  { id: 'online_grocery', name: 'Online Grocery', icon: '📦' },
  { id: 'offline_grocery', name: 'Offline Grocery', icon: '🛒' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'bills', name: 'Bills', icon: '💵' },
  { id: 'health', name: 'Health', icon: '🏥' },
  { id: 'home', name: 'Home', icon: '🏠' },
  { id: 'other', name: 'Other', icon: '🏷️' },
];

export const AVAILABLE_AVATARS = [
  { id: 'avatar_1', emoji: '🦊', label: 'Fox' },
  { id: 'avatar_2', emoji: '🐱', label: 'Cat' },
  { id: 'avatar_3', emoji: '🐨', label: 'Koala' },
  { id: 'avatar_4', emoji: '🦁', label: 'Lion' },
  { id: 'avatar_5', emoji: '🐼', label: 'Panda' },
  { id: 'avatar_6', emoji: '🐸', label: 'Frog' },
  { id: 'avatar_7', emoji: '🐵', label: 'Monkey' },
  { id: 'avatar_8', emoji: '🦄', label: 'Unicorn' },
  { id: 'avatar_9', emoji: '🐧', label: 'Penguin' },
  { id: 'avatar_10', emoji: '🦖', label: 'T-Rex' },
];

export const SECURE_STORE_KEYS = {
  USER_PROFILE: 'moneymate_user_profile',
  DEVICE_ID: 'moneymate_device_id',
};
