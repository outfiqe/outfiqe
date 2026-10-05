export const LIGHT_THEME_BRAND_TOKENS = {
  foreground: "200 12% 13%",
  primary: "175 66% 52%",
  secondary: "200 20% 14%",
} as const;

export type BrandTokenName = keyof typeof LIGHT_THEME_BRAND_TOKENS;

const HSL_TRIPLET_PATTERN = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;
const DEGREES_PER_HUE_SECTOR = 60;
const HUE_SECTORS = 6;
const PERCENT = 100;
const MAX_CHANNEL = 255;
const HEX_RADIX = 16;
const HEX_CHANNEL_WIDTH = 2;

const channelToHex = (channel: number): string =>
  Math.round(channel * MAX_CHANNEL)
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_WIDTH, "0");

export const hslTripletToHex = (triplet: string): string => {
  const match = HSL_TRIPLET_PATTERN.exec(triplet.trim());
  if (!match) throw new Error(`Not an HSL token triplet: "${triplet}"`);

  const [, hueText, saturationText, lightnessText] = match;
  const hue = Number(hueText);
  const saturation = Number(saturationText) / PERCENT;
  const lightness = Number(lightnessText) / PERCENT;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = (hue / DEGREES_PER_HUE_SECTOR) % HUE_SECTORS;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const lightnessOffset = lightness - chroma / 2;

  const sectorChannels: [number, number, number][] = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ];
  const [red, green, blue] = sectorChannels[Math.floor(huePrime)] ?? [0, 0, 0];

  return `#${[red, green, blue].map((channel) => channelToHex(channel + lightnessOffset)).join("")}`;
};

export const lightThemeBrandHex = (token: BrandTokenName): string =>
  hslTripletToHex(LIGHT_THEME_BRAND_TOKENS[token]);
