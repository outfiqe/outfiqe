"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { Share, SquarePlus } from "lucide-react";
import { useState } from "react";

import { useInstallPrompt } from "../hooks/useInstallPrompt";

const barClassName =
  "fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg lg:bottom-6";

export const InstallPrompt = () => {
  const { state, dismiss, install } = useInstallPrompt();
  const [areIosStepsOpen, setAreIosStepsOpen] = useState(false);

  if (state === "hidden") return null;

  const openInstallFlow = state === "can-install" ? install : () => setAreIosStepsOpen(true);

  return (
    <>
      <div role="status" className={barClassName}>
        <p className="text-sm text-foreground">
          Install Outfiqe for a faster, full-screen experience.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Not now
          </button>
          <Button size="sm" className="cursor-pointer" onClick={openInstallFlow}>
            Install
          </Button>
        </div>
      </div>

      <Modal
        open={areIosStepsOpen}
        onClose={() => setAreIosStepsOpen(false)}
        title="Add Outfiqe to your Home Screen"
        description="Safari doesn't offer an install button, so this takes two taps instead."
        footer={
          <div className="flex justify-end">
            <Button className="cursor-pointer" onClick={() => setAreIosStepsOpen(false)}>
              Got it
            </Button>
          </div>
        }
      >
        <ol className="space-y-4 text-sm text-foreground">
          <li className="flex items-center gap-3">
            <Share className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Tap the Share icon in Safari&apos;s toolbar.</span>
          </li>
          <li className="flex items-center gap-3">
            <SquarePlus className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Scroll down and tap &quot;Add to Home Screen&quot;.</span>
          </li>
        </ol>
      </Modal>
    </>
  );
};
