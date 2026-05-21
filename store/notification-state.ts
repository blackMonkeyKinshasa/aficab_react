import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';


interface NotifState {
  countNotif: number;
  setCountNotif: (count: number) => void;
  clearCountNotif: () => void;
 
}

export const useMyStateNotif = create<NotifState>()(
  persist(
    (set) => ({

        countNotif: 0,
    
      setCountNotif: (count) =>
        set({
          countNotif :count 
        }),


      clearCountNotif: () =>
        set({
          countNotif: 0
        }),

    
      
    }),
    {
      name: 'my-state-notification',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);