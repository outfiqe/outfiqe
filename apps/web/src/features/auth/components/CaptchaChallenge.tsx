"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

type CaptchaChallengeProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
};

export const CaptchaChallenge = ({ onVerify, onExpire }: CaptchaChallengeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isScriptReady, setIsScriptReady] = useState(false);

  useEffect(() => {
    if (!isScriptReady || !containerRef.current || !window.turnstile) return;

    const turnstile = window.turnstile;
    const widgetId = turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: onVerify,
      "expired-callback": onExpire,
    });
    widgetIdRef.current = widgetId;

    return () => {
      turnstile.remove(widgetId);
    };
  }, [isScriptReady, onVerify, onExpire]);

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="lazyOnload"
        onReady={() => setIsScriptReady(true)}
      />
      <div ref={containerRef} className="mt-4" />
    </>
  );
};
