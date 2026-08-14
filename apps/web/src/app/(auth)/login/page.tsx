import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth";
import { getDefaultRouteForUser, getServerSession } from "@/features/auth/api/serverAuth";
import { getSafeRedirect } from "@/features/auth/utils/safeRedirect";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

const LoginPage = async ({ searchParams }: LoginPageProps) => {
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
};

export default LoginPage;
