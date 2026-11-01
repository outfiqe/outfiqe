import { Drawer, DrawerScrollArea } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import type { CrmPeriodSummary } from "../api/reportingSchemas";
import { TeamMemberProfile } from "./TeamMemberProfile";
import { TeamMemberWork } from "./TeamMemberWork";

export const TeamMemberPanel = ({
  member,
  onClose,
}: {
  member: CrmPeriodSummary["team"][number];
  onClose: () => void;
}) => {
  return (
    <Drawer
      open
      onClose={onClose}
      title={member.name}
      footer={
        <div className="px-5 py-3">
          <Link
            to="/crm"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            See your team
          </Link>
        </div>
      }
    >
      <DrawerScrollArea className="space-y-5 p-5">
        <TeamMemberProfile {...member} />
        <TeamMemberWork title="In this period" member={member} />
      </DrawerScrollArea>
    </Drawer>
  );
};
