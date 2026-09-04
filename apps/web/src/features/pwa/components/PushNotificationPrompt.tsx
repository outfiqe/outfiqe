"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { useState } from "react";

import { useAuth } from "@/features/auth";

import { isPushPromptDismissed, rememberPushPromptDismissed } from "../constants/pushOptIn";
import { usePushSubscription } from "../hooks/usePushSubscription";

const barClassName =
  "fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg lg:bottom-6";

export const PushNotificationPrompt = () => {
  const { isAuthenticated } = useAuth();
  const { state, enable } = usePushSubscription();
  const [isDismissed, setIsDismissed] = useState(() => isPushPromptDismissed());
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  const dismiss = () => {
    rememberPushPromptDismissed();
    setIsDismissed(true);
  };

  const confirmEnable = async () => {
    setIsExplainerOpen(false);
    await enable();
  };

  if (!isAuthenticated || isDismissed) return null;
  if (state === "unavailable" || state === "enabled" || state === "enabling") return null;

  if (state === "needs-install") {
    return (
      <div role="status" className={barClassName}>
        <p className="text-sm text-foreground">
          Add Outfiqe to your Home Screen to turn on notifications.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Got it
        </button>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div role="status" className={barClassName}>
        <p className="text-sm text-foreground">
          Notifications are blocked. Turn them back on in your browser settings for this site.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Got it
        </button>
      </div>
    );
  }

  return (
    <>
      <div role="status" className={barClassName}>
        <p className="text-sm text-foreground">
          {state === "failed"
            ? "Something went wrong turning on notifications."
            : "Get notified when people like, follow, or message you."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Not now
          </button>
          <Button size="sm" className="cursor-pointer" onClick={() => setIsExplainerOpen(true)}>
            {state === "failed" ? "Try again" : "Turn on"}
          </Button>
        </div>
      </div>

      <Modal
        open={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        title="Turn on notifications"
        description="Your browser will ask next. You can turn this off any time."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsExplainerOpen(false)}
            >
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={confirmEnable}>
              Continue
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Outfiqe will send a notification when someone likes your look, follows you, sends a
          message, or there&apos;s an update on your orders. Nothing else.
        </p>
      </Modal>
    </>
  );
};
