"use client";

import type { PanInfo } from "framer-motion";
import { useCallback } from "react";

export const SWIPE_DISMISS_DISTANCE_PX = 96;
export const SWIPE_DISMISS_VELOCITY = 600;

export const shouldDismissOnSwipe = (dragOffsetY: number, dragVelocityY: number): boolean =>
  dragOffsetY > SWIPE_DISMISS_DISTANCE_PX || dragVelocityY > SWIPE_DISMISS_VELOCITY;

export type SwipeToDismissDragProps = {
  drag: "y";
  dragConstraints: { top: number; bottom: number };
  dragElastic: { top: number; bottom: number };
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
};

export const useSwipeToDismiss = (onDismiss: () => void): SwipeToDismissDragProps => {
  const onDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (shouldDismissOnSwipe(info.offset.y, info.velocity.y)) onDismiss();
    },
    [onDismiss],
  );

  return {
    drag: "y",
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.6 },
    onDragEnd,
  };
};
