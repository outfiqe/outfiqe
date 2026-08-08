"use client";

import { useSearchParams } from "next/navigation";

import { FormBanner } from "@/components/FormBanner";

export function ApplyExpiredBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("expired") !== "1") return null;

  return (
    <div className="mt-6 max-w-2xl">
      <FormBanner>
        That invite link is no longer valid. Apply again below and we&apos;ll send a new one.
      </FormBanner>
    </div>
  );
}
