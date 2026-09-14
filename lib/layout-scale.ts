import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Largeur de référence (iPhone 14). */
const BASE_WIDTH = 390;
const MIN_FACTOR = 0.9;
const MAX_FACTOR = 1.55;

export function getLayoutScale(width: number, height: number) {
  const guideline = Math.min(width, height);
  const factor = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, guideline / BASE_WIDTH));

  const s = (size: number) => Math.round(size * factor);
  const ms = (size: number, intensity = 0.55) =>
    Math.round(size + (size * factor - size) * intensity);

  const imageHeight = (base: number, widthRatio = 0.48, max = 420) =>
    Math.round(Math.min(Math.max(width * widthRatio, s(base * 0.9)), max));

  return {
    width,
    height,
    factor,
    s,
    ms,
    imageHeight,
    font: {
      xs: ms(12),
      sm: ms(14),
      base: ms(16),
      md: ms(15),
      lg: ms(18),
      xl: ms(22),
      display: ms(32),
    },
  };
}

export function useLayoutScale() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => getLayoutScale(width, height), [width, height]);
}
