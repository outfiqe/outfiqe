import type { ReactNode } from "react";

import { AuthLayout } from "@/components/AuthLayout";

const AuthRouteLayout = ({ children }: { children: ReactNode }) => {
  return <AuthLayout>{children}</AuthLayout>;
};

export default AuthRouteLayout;
