import { create } from 'zustand';

interface TripState {
  isActive: boolean;
  expiresAt: number | null;
  startTrip: (minutes: number) => void;
  stopTrip: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  isActive: false,
  expiresAt: null,
  startTrip: (minutes) => {
    const expiresAt = Date.now() + minutes * 60000;
    set({ isActive: true, expiresAt });
  },
  stopTrip: () => set({ isActive: false, expiresAt: null }),
}));
