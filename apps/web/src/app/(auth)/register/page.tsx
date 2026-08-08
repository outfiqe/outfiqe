import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth";
import { getDefaultRouteForUser, getServerSession } from "@/features/auth/api/serverAuth";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage() {
  const user = await getServerSession();
  if (user) redirect(getDefaultRouteForUser(user));

  return <RegisterForm />;
}
