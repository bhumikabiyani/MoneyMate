import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { DBService } from '../services/db';
import { User } from '../types';
import { SECURE_STORE_KEYS } from '../utils/constants';

interface UserContextType {
  user: User | null;
  loading: boolean;
  deviceId: string | null;
  createUserProfile: (name: string, avatarEmoji: string, secondPersonName?: string) => Promise<User>;
  clearUserProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndDevice();
  }, []);

  const loadUserAndDevice = async () => {
    try {
      // 1. Get or generate device ID
      let id = '';
      if (Platform.OS === 'android') {
        id = Application.getAndroidId() || '';
      } else if (Platform.OS === 'ios') {
        id = (await Application.getIosIdForVendorAsync()) || '';
      }

      // If no hardware ID available, generate a fallback random string
      if (!id) {
        const storedId = await SecureStore.getItemAsync(SECURE_STORE_KEYS.DEVICE_ID);
        if (storedId) {
          id = storedId;
        } else {
          id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await SecureStore.setItemAsync(SECURE_STORE_KEYS.DEVICE_ID, id);
        }
      }
      setDeviceId(id);

      // 2. Load stored user profile
      const storedProfile = await SecureStore.getItemAsync(SECURE_STORE_KEYS.USER_PROFILE);
      if (storedProfile) {
        setUser(JSON.parse(storedProfile));
      }
    } catch (e) {
      console.error('Failed to load user or device settings', e);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (name: string, avatarEmoji: string, secondPersonName?: string): Promise<User> => {
    try {
      setLoading(true);
      const newUser = await DBService.createUser(name, avatarEmoji, deviceId || 'unknown_device');

      // Create the second user profile in the database
      const finalSecondName = secondPersonName?.trim() || 'User 2';
      await DBService.createUser(finalSecondName, '👩', 'second_user_device');

      // Save locally in SecureStore for quick root checks
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_PROFILE, JSON.stringify(newUser));
      setUser(newUser);
      
      return newUser;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearUserProfile = async () => {
    try {
      setLoading(true);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.USER_PROFILE);
      setUser(null);
    } catch (error) {
      console.error('Error clearing profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        deviceId,
        createUserProfile,
        clearUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
