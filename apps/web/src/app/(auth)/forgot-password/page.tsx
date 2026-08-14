import type { Metadata } from "next";
import { Suspense } from "react";

import { ForgotPasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Reset your password" };

const ForgotPasswordPage = () => {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
};

export default ForgotPasswordPage;
