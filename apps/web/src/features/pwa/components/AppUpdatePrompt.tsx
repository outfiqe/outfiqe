"use client";

import { Button } from "@outfiqe/design-system";
import { useSerwist } from "@serwist/turbopack/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { isUpdatePromptSuppressed } from "../constants/updatePrompt";

export const AppUpdatePrompt = () => {
  const { serwist } = useSerwist();
  const pathname = usePathname();
  const [isUpdateWaiting, setIsUpdateWaiting] = useState(false);
  const hasAcceptedUpdate = useRef(false);

  useEffect(() => {
    if (!serwist) return;

    const showUpdatePrompt = () => setIsUpdateWaiting(true);
    const reloadOnlyIfTheUserAskedFor = () => {
      if (hasAcceptedUpdate.current) window.location.reload();
    };

    serwist.addEventListener("waiting", showUpdatePrompt);
    serwist.addEventListener("controlling", reloadOnlyIfTheUserAskedFor);

    return () => {
      serwist.removeEventListener("waiting", showUpdatePrompt);
      serwist.removeEventListener("controlling", reloadOnlyIfTheUserAskedFor);
    };
  }, [serwist]);

  if (!isUpdateWaiting || isUpdatePromptSuppressed(pathname)) return null;

  const applyUpdate = () => {
    hasAcceptedUpdate.current = true;
    serwist?.messageSkipWaiting();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg lg:bottom-6"
    >
      <p className="text-sm text-foreground">A new version of Outfiqe is ready.</p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setIsUpdateWaiting(false)}
          className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Later
        </button>
        <Button size="sm" className="cursor-pointer" onClick={applyUpdate}>
          Reload
        </Button>
      </div>
    </div>
  );
};
