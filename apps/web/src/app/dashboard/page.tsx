import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { UserRole } from "@/features/auth/types";
import { BrandDashboard, getBrandProfileServer } from "@/features/brand-dashboard";
import { CreatorDashboard, getCreatorProfileServer } from "@/features/creator-dashboard";
import { DashboardLogoutButton } from "./LogoutButton";

export const metadata: Metadata = { title: "Dashboard" };

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

export default async function DashboardPage() {
  const session = await getServerSessionWithToken();
  if (!session) redirect("/login?redirect=/dashboard");

  const { user, accessToken } = session;
  if (user.role === UserRole.ADMIN) redirect(ADMIN_URL);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">
        {user.role === UserRole.BRAND_OWNER ? "Brand dashboard" : "Your dashboard"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user.name} ({user.email}).
      </p>

      <div className="mt-8">
        {user.role === UserRole.BRAND_OWNER ? (
          <BrandDashboardSection accessToken={accessToken} />
        ) : (
          <CreatorDashboardSection accessToken={accessToken} />
        )}
      </div>

      <DashboardLogoutButton />
    </main>
  );
}

async function BrandDashboardSection({ accessToken }: { accessToken: string }) {
  const profile = await getBrandProfileServer(accessToken);
  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">We couldn&apos;t load your brand right now.</p>
    );
  }
  return <BrandDashboard profile={profile} />;
}

async function CreatorDashboardSection({ accessToken }: { accessToken: string }) {
  const profile = await getCreatorProfileServer(accessToken);
  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">We couldn&apos;t load your profile right now.</p>
    );
  }
  return <CreatorDashboard profile={profile} />;
}
