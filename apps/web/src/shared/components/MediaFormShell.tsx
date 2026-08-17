"use client";

import type { CSSProperties, ReactNode } from "react";

export const MEDIA_PANE_WIDTH_PX = 380;
const DEFAULT_ROW_HEIGHT_PX = 480;

export const getMediaRowHeightPx = (photoAspect?: number): number =>
  photoAspect ? MEDIA_PANE_WIDTH_PX / photoAspect : DEFAULT_ROW_HEIGHT_PX;

type MediaFormShellProps = {
  photos: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  photoAspect?: number;
};

export const MediaFormShell = ({ photos, footer, children, photoAspect }: MediaFormShellProps) => {
  const rowHeightPx = getMediaRowHeightPx(photoAspect);

  return (
    <div
      className="-mx-6 -my-5 flex flex-col sm:h-[var(--modal-row-height)] sm:flex-row"
      style={{ "--modal-row-height": `${rowHeightPx}px` } as CSSProperties}
    >
      <div className="flex shrink-0 flex-col border-b border-border sm:w-95 sm:border-b-0 sm:border-r">
        {photos}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
};
