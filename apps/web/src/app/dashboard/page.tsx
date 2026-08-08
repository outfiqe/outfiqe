import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "@/features/auth/api/serverAuth";
import { UserRole } from "@/features/auth/types";
import { DashboardLogoutButton } from "./LogoutButton";

export const metadata: Metadata = { title: "Brand dashboard" };

export default async function DashboardPage() {
  const user = await getServerSession();
  if (!user) redirect("/login?redirect=/dashboard");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/");

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Brand dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user.name} ({user.email}).
      </p>
      <DashboardLogoutButton />
    </main>
  );
}
