const NO_COUNT = 0;
const SINGLE_COUNT = 1;

export const formatCountLabel = (count: number, singular: string, plural: string): string =>
  `${count.toLocaleString()} ${count === SINGLE_COUNT ? singular : plural}`;

export const formatResultCount = (pieceCount: number, brandCount: number): string => {
  if (pieceCount <= NO_COUNT) return "";

  const pieceLabel = formatCountLabel(pieceCount, "piece", "pieces");
  const brandLabel = formatCountLabel(brandCount, "brand", "brands");
  return `${pieceLabel} from ${brandLabel}`;
};
