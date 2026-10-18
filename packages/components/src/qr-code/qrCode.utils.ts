import QRCode from "qrcode";

const QUIET_ZONE_MODULES = 4;
const QUIET_ZONE_SIDES = 2;
const DARK_MODULE = 1;

export type QrMatrix = {
  moduleCount: number;
  path: string;
};

export const buildQrMatrix = (value: string): QrMatrix => {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const { size, data } = modules;
  const darkModulePaths = Array.from(data, (moduleValue, index) => {
    if (moduleValue !== DARK_MODULE) return "";
    const column = (index % size) + QUIET_ZONE_MODULES;
    const row = Math.floor(index / size) + QUIET_ZONE_MODULES;
    return `M${column} ${row}h1v1h-1z`;
  });
  return {
    moduleCount: size + QUIET_ZONE_MODULES * QUIET_ZONE_SIDES,
    path: darkModulePaths.join(""),
  };
};
