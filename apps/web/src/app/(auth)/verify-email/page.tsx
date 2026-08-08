import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailScreen } from "@/features/auth";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
