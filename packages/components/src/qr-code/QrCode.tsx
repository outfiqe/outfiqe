import { useMemo } from "react";

import { buildQrMatrix } from "./qrCode.utils";

type QrCodeProps = {
  value: string;
  label: string;
  size?: number;
  className?: string;
};

const DEFAULT_SIZE_PX = 192;

export const QrCode = ({ value, label, size = DEFAULT_SIZE_PX, className }: QrCodeProps) => {
  const { moduleCount, path } = useMemo(() => buildQrMatrix(value), [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={moduleCount} height={moduleCount} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
};
