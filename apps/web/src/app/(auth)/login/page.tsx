import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth";
import { getDefaultRouteForUser, getServerSession } from "@/features/auth/api/serverAuth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getServerSession();
  if (user) redirect(getDefaultRouteForUser(user));

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
