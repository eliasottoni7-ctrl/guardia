import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisguiseMode = 'none' | 'notes' | 'food';

interface SettingsState {
  disguiseMode: DisguiseMode;
  setDisguiseMode: (mode: DisguiseMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      disguiseMode: 'none', // Default is no disguise (enters safe area immediately)
      setDisguiseMode: (mode) => set({ disguiseMode: mode }),
    }),
    {
      name: 'guardian-settings', // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
