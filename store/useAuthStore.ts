import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import type { Tables } from '../types/database.types';

interface AuthState {
  session: Session | null;
  profile: Tables<'profiles'> | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Tables<'profiles'> | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  initialized: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
}));
