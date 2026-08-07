import chroma from 'chroma-js';
import { Hsluv } from 'hsluv';

type PaletteConfig = {
  color: string;
  hue?: number;
  hues?: number[];
  colorMode?: 'linear' | 'perceived';
  h?: number;
  s?: number;
  lMin?: number;
  lMax?: number;
  mode?: 'hex' | 'p-3' | 'oklch' | 'hsl';
};

type Color = {
  hue: number;
  hex: string;
  oklch: string;
  h: number;
  hScale: number;
  s: number;
  sScale: number;
  l: number;
};

export class TonalPalette {
  private readonly palette: Color[];

  constructor(config: PaletteConfig) {
    this.palette = this.generatePalette(config);
  }

  /**
   * Chroma-js based implementation for stable palette generation.
   * Uses HSLuv for perceived mode and direct HSL manipulation for linear mode.
   * https://github.com/SimeonGriggs/tints.dev.
   */
  private generatePalette(config: PaletteConfig): Color[] {
    const { color } = config;

    // Tweaks may be passed in, otherwise use defaults
    const colorHue = config.hue ?? 600;
    const hues = config.hues ?? [
      0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000,
    ];
    const colorMode = config.colorMode ?? 'perceived';
    const h = config.h ?? 0;
    const s = config.s ?? 0;
    const lMin = config.lMin ?? 0;
    const lMax = config.lMax ?? 100;

    // Create base color from input
    const baseColor = chroma(`${color}`);
    const [baseH, baseS, baseL] = baseColor.hsl();

    // Handle grayscale colors (NaN hue) by setting a default hue
    const normalizedBaseH = isNaN(baseH) ? 0 : baseH;

    // 1. Create hue scale
    const colorHueIndex = hues.indexOf(colorHue);
    if (colorHueIndex === -1) {
      throw new Error(`Invalid color hue: ${colorHue}`);
    }

    const hueScale = hues.map((hue) => {
      const diff = Math.abs(hues.indexOf(hue) - colorHueIndex);
      const tweakValue = h ? diff * h : 0;
      return { hue, tweak: tweakValue };
    });

    // 2. Create saturation scale
    const saturationScale = hues.map((hue) => {
      const diff = Math.abs(hues.indexOf(hue) - colorHueIndex);
      const tweakValue = s ? Math.round((diff + 1) * s * (1 + diff / 10)) : 0;
      return { hue, tweak: Math.min(tweakValue, 100) };
    });

    // 3. Create lightness distribution
    const hsluv = new Hsluv();
    hsluv.hex = `${color}`;
    hsluv.hexToHsluv();

    const lightnessValue = colorMode === 'linear' ? baseL * 100 : hsluv.hsluv_l;

    // Create the three anchor points
    const distributionAnchors = [
      { hue: 0, tweak: lMax },
      { hue: colorHue, tweak: lightnessValue },
      { hue: 1000, tweak: lMin },
    ];

    // Interpolate for missing hues
    const distributionScale = hues.map((hue) => {
      // If it's an anchor point, use the anchor value
      const anchor = distributionAnchors.find((a) => a.hue === hue);
      if (anchor) {
        return anchor;
      }

      // Otherwise interpolate between anchor points
      let leftAnchor, rightAnchor;

      if (hue < colorHue) {
        leftAnchor = distributionAnchors[0]; // 0
        rightAnchor = distributionAnchors[1]; // hue
      } else {
        leftAnchor = distributionAnchors[1]; // hue
        rightAnchor = distributionAnchors[2]; // 1000
      }

      // Linear interpolation
      const range = rightAnchor.hue - leftAnchor.hue;
      const position = hue - leftAnchor.hue;
      const ratio = position / range;
      const tweak =
        leftAnchor.tweak + (rightAnchor.tweak - leftAnchor.tweak) * ratio;

      return { hue, tweak: Math.round(tweak) };
    });

    return hues.map((hue, hueIndex) => {
      if (hue === colorHue) {
        // Preserve exact input color
        const inputColor = chroma(`${color.toUpperCase()}`);
        const [finalH, finalS, finalL] = inputColor.hsl();

        return {
          hue: hue,
          hex: `${color.toUpperCase()}`,
          oklch: inputColor.css('oklch'),
          h: isNaN(finalH) ? 0 : finalH,
          hScale: 0,
          s: isNaN(finalS) ? 0 : finalS * 100,
          sScale: (isNaN(finalS) ? 0 : finalS * 100) - 50,
          l: isNaN(finalL) ? 0 : finalL * 100,
        };
      }

      // Get tweaks for this hue
      const hTweak = hueScale[hueIndex].tweak;
      const sTweak = saturationScale[hueIndex].tweak;
      const lTweak = distributionScale[hueIndex].tweak;

      let newColor: chroma.Color;

      if (colorMode === 'linear') {
        // Direct HSL manipulation for linear mode
        const newH = (normalizedBaseH + hTweak) % 360;
        const newS = Math.max(0, Math.min(100, baseS * 100 + sTweak));
        const newL = Math.max(0, Math.min(100, lTweak));

        newColor = chroma.hsl(newH, newS / 100, newL / 100);
      } else {
        // HSLuv for perceived mode
        const hsluv = new Hsluv();
        hsluv.hex = `${color}`;
        hsluv.hexToHsluv();

        // Handle grayscale colors in HSLuv (NaN hue)
        const normalizedHsluvH = isNaN(hsluv.hsluv_h) ? 0 : hsluv.hsluv_h;
        const newHsluvH = (normalizedHsluvH + hTweak) % 360;
        const newHsluvS = Math.max(0, Math.min(100, hsluv.hsluv_s + sTweak));
        const newHsluvL = Math.max(0, Math.min(100, lTweak));

        hsluv.hsluv_h = newHsluvH;
        hsluv.hsluv_s = newHsluvS;
        hsluv.hsluv_l = newHsluvL;
        hsluv.hsluvToHex();

        newColor = chroma(hsluv.hex);
      }

      const [finalH, finalS, finalL] = newColor.hsl();

      return {
        hue: hue,
        hex: newColor.hex().toUpperCase(),
        oklch: newColor.css('oklch'),
        h: isNaN(finalH) ? 0 : finalH,
        hScale: ((((hTweak + 180) % 360) - 180) / 180) * 50,
        s: isNaN(finalS) ? 0 : finalS * 100,
        sScale: (isNaN(finalS) ? 0 : finalS * 100) - 50,
        l: isNaN(finalL) ? 0 : finalL * 100,
      };
    });
  }

  /**
   * Get all colors in the palette.
   */
  colors(): Color[] {
    return this.palette;
  }

  /**
   * Get a specific color by its hue.
   * @param value
   * @param format
   */
  hue(value: number, format: 'hex' | 'oklch' = 'oklch'): string | null {
    const color = this.palette.find((c) => c.hue === value);
    if (!color) {
      return null;
    }

    return format === 'hex' ? color.hex : color.oklch;
  }
}
