import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandRegisterForm } from "@/features/auth";
import { getBrandInviteServer } from "@/features/auth/api/serverAuth";

export const metadata: Metadata = { title: "Set up your brand account" };

interface BrandRegisterPageProps {
  searchParams: Promise<{ token?: string }>;
}

const BrandRegisterPage = async ({ searchParams }: BrandRegisterPageProps) => {
  const { token } = await searchParams;
  if (!token) redirect("/apply");

  const invite = await getBrandInviteServer(token);
  if (!invite) redirect("/apply?expired=1");

  return (
    <BrandRegisterForm inviteToken={token} email={invite.email} brandName={invite.brandName} />
  );
};

export default BrandRegisterPage;
