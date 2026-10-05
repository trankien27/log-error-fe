/**
 * Shared shift-code colors (S / C / T / S+ / C+).
 *
 * Backgrounds are translucent tints (color-mix with transparent) and text uses the
 * on-surface token, so chips stay readable on both the light and dark themes.
 * Class strings are written out in full so Tailwind can detect them.
 */
export const SHIFT_COLOR_CLASSES: Record<string, string> = {
  S: 'bg-[color-mix(in_srgb,#4b8fe0_16%,transparent)] border-[color-mix(in_srgb,#4b8fe0_65%,transparent)] text-on-surface',
  C: 'bg-[color-mix(in_srgb,#5aae4a_16%,transparent)] border-[color-mix(in_srgb,#5aae4a_65%,transparent)] text-on-surface',
  T: 'bg-[color-mix(in_srgb,#8f63d9_16%,transparent)] border-[color-mix(in_srgb,#8f63d9_65%,transparent)] text-on-surface',
  'S+': 'bg-[color-mix(in_srgb,#e0a12a_18%,transparent)] border-[color-mix(in_srgb,#e0a12a_70%,transparent)] text-on-surface',
  'C+': 'bg-[color-mix(in_srgb,#d95c7a_16%,transparent)] border-[color-mix(in_srgb,#d95c7a_65%,transparent)] text-on-surface',
};

export const SHIFT_FALLBACK_CLASS = 'bg-surface-2 border-outline-variant text-on-surface';

export function getShiftClass(code?: string | null) {
  return SHIFT_COLOR_CLASSES[code || ''] || SHIFT_FALLBACK_CLASS;
}
