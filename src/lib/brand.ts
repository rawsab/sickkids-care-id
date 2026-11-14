// SickKids corporate palette (Brand Tipsheet 08.22). Every colour in the app is
// one of these, a tint of one (the colour at partial opacity over white), or
// white. CSS uses the same values as tokens in globals.css; this copy is for
// code that needs literals (MapLibre, Recharts, inline SVG).
export const SK = {
  royal: "#0066AD",
  ocean: "#01B3D9",
  apple: "#8AD260",
  pineapple: "#F1E94D",
  pine: "#1F574E",
  tangerine: "#E6863E",
  charcoal: "#54575A",
  bubblegum: "#D95296",
  cherry: "#BF4140",
  blueberry: "#002058",
  eggplant: "#514684",
  licorice: "#000000",
} as const;

/** `hex` at `alpha` opacity, flattened over white (same as CSS `color-mix(in srgb, hex alpha%, white)`). */
export function tint(hex: string, alpha: number): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v * alpha + 255 * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Neutrals for chart chrome; mirror the CSS tokens of the same name. */
export const INK = {
  text: SK.blueberry,
  subtle: tint(SK.charcoal, 0.9),
  border: tint(SK.blueberry, 0.12),
  borderStrong: tint(SK.blueberry, 0.22),
  grid: tint(SK.blueberry, 0.08),
} as const;
