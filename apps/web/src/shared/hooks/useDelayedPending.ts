"use client";

import { useEffect, useState } from "react";

const DEFAULT_DELAY_MS = 300;

export const useDelayedPending = (
  isPending: boolean,
  delay: number = DEFAULT_DELAY_MS,
): boolean => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(isPending), isPending ? delay : 0);
    return () => clearTimeout(timer);
  }, [isPending, delay]);

  return show;
};
