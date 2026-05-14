import { create } from 'zustand';

type AppState = {
  shellReady: boolean;
  markShellReady: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  shellReady: false,
  markShellReady: () => set({ shellReady: true }),
}));
