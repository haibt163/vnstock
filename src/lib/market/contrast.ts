function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Token pairs that must meet WCAG AA (4.5:1 body / 3:1 large or incidental). */
export const CONTRAST_PAIRS: { name: string; fg: string; bg: string; min: number }[] = [
  { name: "light body", fg: "#152033", bg: "#e8edf4", min: 4.5 },
  { name: "light muted", fg: "#3a4a60", bg: "#e8edf4", min: 4.5 },
  { name: "light subtle", fg: "#5c6b82", bg: "#e8edf4", min: 3 },
  { name: "light gain", fg: "#0a6b3c", bg: "#e8edf4", min: 4.5 },
  { name: "light loss", fg: "#b4233a", bg: "#e8edf4", min: 4.5 },
  { name: "light on surface-2", fg: "#152033", bg: "#ffffff", min: 4.5 },
  { name: "light muted on surface-2", fg: "#3a4a60", bg: "#ffffff", min: 4.5 },
  { name: "dark body", fg: "#e7edf6", bg: "#070a11", min: 4.5 },
  { name: "dark muted", fg: "#9aa8bb", bg: "#070a11", min: 4.5 },
  { name: "dark subtle", fg: "#8b98ab", bg: "#070a11", min: 3 },
  { name: "dark gain", fg: "#3dcc8a", bg: "#070a11", min: 4.5 },
  { name: "dark loss", fg: "#f07186", bg: "#070a11", min: 4.5 },
  { name: "dark on surface-2", fg: "#e7edf6", bg: "#141b28", min: 4.5 },
  { name: "dark muted on surface-2", fg: "#9aa8bb", bg: "#141b28", min: 4.5 },
];
