import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/features/auth";
import { isTokenValidServer } from "@/features/auth/api/serverAuth";
import { TokenPurpose } from "@/features/auth/types";

export const metadata: Metadata = { title: "Choose a new password" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  const { token } = await searchParams;
  if (!token) redirect("/forgot-password");

  const valid = await isTokenValidServer(token, TokenPurpose.PASSWORD_RESET);
  if (!valid) redirect("/forgot-password?expired=1");

  return <ResetPasswordForm token={token} />;
};

export default ResetPasswordPage;
