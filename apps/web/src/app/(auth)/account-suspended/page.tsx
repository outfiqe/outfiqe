import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountSuspendedScreen } from "@/features/auth";

export const metadata: Metadata = { title: "Account suspended" };

export const dynamic = "force-dynamic";

const AccountSuspendedPage = () => {
  return (
    <Suspense fallback={null}>
      <AccountSuspendedScreen />
    </Suspense>
  );
};

export default AccountSuspendedPage;
