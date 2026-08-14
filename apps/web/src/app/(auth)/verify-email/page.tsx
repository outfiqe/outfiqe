import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailScreen } from "@/features/auth";

export const metadata: Metadata = { title: "Verify your email" };

const VerifyEmailPage = () => {
  return (
    <Suspense fallback={null}>
      <VerifyEmailScreen />
    </Suspense>
  );
};

export default VerifyEmailPage;
