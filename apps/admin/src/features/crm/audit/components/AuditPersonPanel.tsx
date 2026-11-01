import { Avatar, Drawer, DrawerScrollArea } from "@outfiqe/design-system";

import { TeamMemberProfile } from "../../reporting/components/TeamMemberProfile";
import { TeamMemberWork } from "../../reporting/components/TeamMemberWork";
import {
  RECENT_WORK_DAYS,
  useTeamMemberRecentWork,
} from "../../reporting/hooks/useTeamMemberRecentWork";
import type { AuditLogRow } from "../utils/auditEntries.utils";

const FORMER_MEMBER_NOTE = "No longer on your team.";

export const AuditPersonPanel = ({
  entry,
  onShowTheirActivity,
  onClose,
}: {
  entry: AuditLogRow;
  onShowTheirActivity: () => void;
  onClose: () => void;
}) => {
  const { actorName, actorAvatarUrl, actorMember } = entry;
  const name = actorName ?? "";
  const recentWork = useTeamMemberRecentWork(actorMember?.membershipId);

  return (
    <Drawer
      open
      onClose={onClose}
      title={name}
      footer={
        <div className="px-5 py-3">
          <button
            type="button"
            onClick={onShowTheirActivity}
            className="cursor-pointer text-sm font-medium text-foreground underline underline-offset-4"
          >
            See everything they did
          </button>
        </div>
      }
    >
      <DrawerScrollArea className="space-y-5 p-5">
        {actorMember ? (
          <TeamMemberProfile {...actorMember} name={name} avatarUrl={actorAvatarUrl} />
        ) : (
          <div className="flex items-center gap-3">
            <Avatar name={name} imageUrl={actorAvatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{FORMER_MEMBER_NOTE}</p>
            </div>
          </div>
        )}
        {recentWork && (
          <TeamMemberWork title={`In the last ${RECENT_WORK_DAYS} days`} member={recentWork} />
        )}
      </DrawerScrollArea>
    </Drawer>
  );
};
