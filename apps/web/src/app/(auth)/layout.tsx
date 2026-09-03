import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthLayout } from "@/components/AuthLayout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const AuthRouteLayout = ({ children }: { children: ReactNode }) => {
  return <AuthLayout>{children}</AuthLayout>;
};

export default AuthRouteLayout;
