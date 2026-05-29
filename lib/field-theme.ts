import { useColorScheme } from 'nativewind';

/** Resolved RGB strings for third-party components (e.g. Google Places) */
export const fieldThemeColors = {
  light: {
    fieldBg: 'rgb(242, 243, 247)',
    text: 'rgb(38, 38, 39)',
    placeholder: 'rgb(142, 142, 147)',
    listBg: 'rgb(255, 255, 255)',
    listItemText: 'rgb(38, 38, 39)',
    listItemSubText: 'rgb(115, 115, 115)',
    separator: 'rgb(229, 229, 229)',
    loader: 'rgb(38, 38, 39)',
  },
  dark: {
    fieldBg: 'rgb(65, 64, 64)',
    text: 'rgb(245, 245, 245)',
    placeholder: 'rgb(163, 163, 163)',
    listBg: 'rgb(30, 34, 38)',
    listItemText: 'rgb(255, 255, 255)',
    listItemSubText: 'rgb(160, 160, 160)',
    separator: 'rgb(55, 65, 81)',
    loader: 'rgb(255, 255, 255)',
  },
} as const;

export function useFieldThemeColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? fieldThemeColors.dark : fieldThemeColors.light;
}
