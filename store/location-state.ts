import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Location } from '@/constants/constants';

export interface LocationState {
  recentLocations: Location[];
  addLocation: (location: Location) => void;
  removeLocation: (location: Location) => void;
  clearLocations: () => void;
}

export const useMyStateLocation = create<LocationState>()(
  persist(
    (set) => ({
      recentLocations: [],

      addLocation: (location: Location) =>
        set((state) => {
          const normalizedDescription = location.description.trim().toLowerCase();

          const exists = state.recentLocations.some(
            (item) => item.description.trim().toLowerCase() === normalizedDescription
          );

          if (exists) {
            return state;
          }

          return {
            recentLocations: [location, ...state.recentLocations].slice(0, 5),
          };
        }),

      removeLocation: (location: Location) =>
        set((state) => ({
          recentLocations: state.recentLocations.filter(
            (item) =>
              item.description.trim().toLowerCase() !== location.description.trim().toLowerCase()
          ),
        })),

      clearLocations: () =>
        set({
          recentLocations: [],
        }),
    }),
    {
      name: 'my-state-location',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
