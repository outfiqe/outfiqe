"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PendingEntry<T> = {
  readonly value: T;
  readonly fromKey: string;
};

const STUCK_PENDING_TIMEOUT_MS = 3000;

export const usePendingSelection = <T>(currentKey: string) => {
  const [pending, setPending] = useState<PendingEntry<T> | null>(null);
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const markPending = useCallback(
    (value: T) => {
      clearTimeout(stuckTimeoutRef.current);
      setPending({ value, fromKey: currentKey });
      stuckTimeoutRef.current = setTimeout(() => setPending(null), STUCK_PENDING_TIMEOUT_MS);
    },
    [currentKey],
  );

  useEffect(() => () => clearTimeout(stuckTimeoutRef.current), []);

  return useMemo(() => {
    const isStillPending = pending !== null && pending.fromKey === currentKey;
    return { pendingValue: isStillPending ? pending.value : null, markPending };
  }, [pending, currentKey, markPending]);
};
