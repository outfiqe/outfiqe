import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLayout } from "@/components/AuthLayout";
import { OAuthCallbackScreen } from "@/features/auth";

export const metadata: Metadata = { title: "Signing you in" };

export const dynamic = "force-dynamic";

const OAuthCallbackPage = () => {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <OAuthCallbackScreen />
      </Suspense>
    </AuthLayout>
  );
};

export default OAuthCallbackPage;
