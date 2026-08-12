"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@outfiqe/design-system";

interface CreatorModeModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreatorModeModal({ open, onClose }: CreatorModeModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const confirmSwitch = () => {
    onClose();
    router.push("/dashboard");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="creator-mode-title"
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="creator-mode-title" className="font-display text-lg font-bold text-foreground">
          Switch to creator mode?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;ll be taken to your creator dashboard, where you can post looks and tag products.
          You can switch back to shopping anytime.
        </p>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={confirmSwitch}>
            Switch
          </Button>
        </div>
      </div>
    </div>
  );
}
