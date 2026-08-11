import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth";
import { getDefaultRouteForUser, getServerSession } from "@/features/auth/api/serverAuth";
import { getSafeRedirect } from "@/features/auth/utils/safeRedirect";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getServerSession();
  if (user) {
    const { redirect: requested } = await searchParams;
    redirect(getSafeRedirect(requested) ?? getDefaultRouteForUser(user));
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
