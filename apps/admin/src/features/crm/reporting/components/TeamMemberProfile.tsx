import { Avatar } from "@outfiqe/design-system";

import { MetricRow } from "@/components/MetricParts";

import { useCrmMembers } from "../../hooks/useCrmMembers";
import { formatDate } from "../../utils/format.utils";

export const TeamMemberProfile = ({
  membershipId,
  name,
  avatarUrl,
  roleName,
  joinedAt,
}: {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  roleName: string;
  joinedAt: string;
}) => {
  const email = useCrmMembers()?.find(({ id }) => id === membershipId)?.userEmail;

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={name} imageUrl={avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{roleName}</p>
        </div>
      </div>

      <div>
        {email && <MetricRow label="Email" hasLongValue value={email} />}
        <MetricRow label="Joined" value={formatDate(joinedAt)} />
      </div>
    </>
  );
};
