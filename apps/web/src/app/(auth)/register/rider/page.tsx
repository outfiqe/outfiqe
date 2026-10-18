import type { Metadata } from "next";

import { RiderRegisterForm } from "@/features/auth";
import { getRiderInviteServer } from "@/features/auth/api/serverAuth";
import { RiderInviteUnavailable } from "@/features/rider";

export const metadata: Metadata = { title: "Set up your rider account", robots: { index: false } };

interface RiderRegisterPageProps {
  searchParams: Promise<{ token?: string }>;
}

const RiderRegisterPage = async ({ searchParams }: RiderRegisterPageProps) => {
  const { token } = await searchParams;
  const invite = token ? await getRiderInviteServer(token) : null;
  if (!token || !invite) return <RiderInviteUnavailable />;

  return (
    <RiderRegisterForm
      inviteToken={token}
      email={invite.email}
      name={invite.name}
      hubName={invite.hubName}
    />
  );
};

export default RiderRegisterPage;
