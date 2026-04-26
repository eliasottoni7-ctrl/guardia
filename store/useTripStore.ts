import { create } from 'zustand';

interface TripState {
  isActive: boolean;
  activeTripId: string | null;
  expiresAt: number | null;
  startTrip: (minutes: number, activeTripId?: string | null) => void;
  setActiveTrip: (activeTripId: string, expiresAt: number) => void;
  stopTrip: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  isActive: false,
  activeTripId: null,
  expiresAt: null,
  startTrip: (minutes, activeTripId = null) => {
    const expiresAt = Date.now() + minutes * 60000;
    set({ isActive: true, activeTripId, expiresAt });
  },
  setActiveTrip: (activeTripId, expiresAt) => set({ isActive: true, activeTripId, expiresAt }),
  stopTrip: () => set({ isActive: false, activeTripId: null, expiresAt: null }),
}));
