import type { FontPreset } from './font-interface';
import { standardFont, subStandardFont } from './standard';

export * from './font-interface';
export * from './standard';

export const FONT_PRESETS: Record<string, FontPreset> = {
  standard: {
    id: 'standard',
    name: 'Standard (7×9)',
    description: 'Crisp 7×9 cap height, 4×6 sub-glyphs',
    mainFont: standardFont,
    subFont: subStandardFont,
  },
};
