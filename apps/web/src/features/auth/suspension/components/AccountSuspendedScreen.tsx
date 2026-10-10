"use client";

import { Button } from "@outfiqe/design-system";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

const EXPIRY_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const AccountSuspendedScreen = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const expiresAt = searchParams.get("expiresAt");

  const expiresAtLabel = (() => {
    if (!expiresAt) return null;
    const parsed = new Date(expiresAt);
    return Number.isNaN(parsed.getTime())
      ? null
      : new Intl.DateTimeFormat("en-US", EXPIRY_LABEL_FORMAT).format(parsed);
  })();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Your account has been suspended
      </h1>

      <p className="mt-2.5 text-sm text-muted-foreground">
        {expiresAtLabel
          ? `This is temporary and lifts automatically on ${expiresAtLabel}.`
          : "This suspension has no set end date."}
      </p>

      {reason && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
          {reason}
        </p>
      )}

      <p className="mt-5 text-sm text-muted-foreground">
        If you think this is a mistake, you can reach our team.
      </p>

      <Link href="/contact" className="mt-5 inline-block">
        <Button>Contact us</Button>
      </Link>
    </div>
  );
};
