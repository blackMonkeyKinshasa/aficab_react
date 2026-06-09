import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Shared height for soft fields, primary CTAs, and aligned inputs.
 * Prefer `size="control"` on Button/Input or `controlHeightStyle` — avoid manual h-11/h-12 on native.
 */
export const SOFT_FIELD_HEIGHT = 56;

export const controlHeightStyle: ViewStyle = {
  height: SOFT_FIELD_HEIGHT,
  minHeight: SOFT_FIELD_HEIGHT,
};

export function withControlHeight(style?: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return style ? [controlHeightStyle, style] : controlHeightStyle;
}

export const bookingSpacing = {
  screenPaddingX: 10,
  fieldGap: 12,
  sectionGap: 16,
  scrollPaddingBottom: 120,
  buttonMarginBottom: 24,
  softFieldHeight: SOFT_FIELD_HEIGHT,
} as const;
