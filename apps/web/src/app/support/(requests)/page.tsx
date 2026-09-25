import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { UserRole } from "@/features/auth/types";
import { SupportPageShell, SupportRequestsSkeleton, SupportRequestsView } from "@/features/support";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

const SupportPage = async () => {
  const session = await getServerSessionWithToken();
  if (!session) redirect("/login?redirect=/support");
  if (session.user.role === UserRole.ADMIN) redirect(ADMIN_URL);

  return (
    <SupportPageShell>
      <Suspense fallback={<SupportRequestsSkeleton />}>
        <SupportRequestsView />
      </Suspense>
    </SupportPageShell>
  );
};

export default SupportPage;
