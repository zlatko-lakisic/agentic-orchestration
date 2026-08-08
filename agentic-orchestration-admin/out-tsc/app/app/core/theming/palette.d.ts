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
export declare class TonalPalette {
    private readonly palette;
    constructor(config: PaletteConfig);
    /**
     * Chroma-js based implementation for stable palette generation.
     * Uses HSLuv for perceived mode and direct HSL manipulation for linear mode.
     * https://github.com/SimeonGriggs/tints.dev.
     */
    private generatePalette;
    /**
     * Get all colors in the palette.
     */
    colors(): Color[];
    /**
     * Get a specific color by its hue.
     * @param value
     * @param format
     */
    hue(value: number, format?: 'hex' | 'oklch'): string | null;
}
export {};
