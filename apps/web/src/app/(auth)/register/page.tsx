import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { RegisterForm } from "@/features/auth";
import { getDefaultRouteForUser, getServerSession } from "@/features/auth/api/serverAuth";

export const metadata: Metadata = { title: "Create your account" };

const RegisterPage = async () => {
  const user = await getServerSession();
  if (user) redirect(getDefaultRouteForUser(user));

  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
};

export default RegisterPage;
