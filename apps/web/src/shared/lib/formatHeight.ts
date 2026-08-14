const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export const formatHeight = (heightCm: number): string => {
  const totalInches = Math.round(heightCm / CM_PER_INCH);
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return `${feet}'${inches}"`;
};
