import type { FontPreset } from './font-interface';
import { compactFont, subCompactFont } from './compact';
import { standardFont, subStandardFont } from './standard';
import { largeFont, subLargeFont } from './large';

export * from './font-interface';
export * from './compact';
export * from './standard';
export * from './large';

export const FONT_PRESETS: Record<string, FontPreset> = {
  compact: {
    id: 'compact',
    name: 'Compact',
    description: '5×7 cap height (3×5 sub)',
    mainFont: compactFont,
    subFont: subCompactFont,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    description: '7×9 cap height (4×6 sub)',
    mainFont: standardFont,
    subFont: subStandardFont,
  },
  large: {
    id: 'large',
    name: 'Large',
    description: '9×12 cap height (5×7 sub)',
    mainFont: largeFont,
    subFont: subLargeFont,
  },
};
