import { create } from 'zustand';
import type { LocationObject } from 'expo-location';

interface LocationState {
  location: LocationObject | null;
  errorMsg: string | null;
  setLocation: (location: LocationObject) => void;
  setErrorMsg: (errorMsg: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  errorMsg: null,
  setLocation: (location) => set({ location, errorMsg: null }),
  setErrorMsg: (errorMsg) => set({ errorMsg }),
}));
