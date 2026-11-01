import type { SidebarNavSection } from "@outfiqe/components";
import { Badge, cn } from "@outfiqe/design-system";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";

import type { AdminUser } from "@/features/auth/api/authSchemas";

import { AdminModuleSearch } from "./AdminModuleSearch";

type AdminSidebarAccountProps = {
  user: AdminUser;
  accountLabel: string;
  collapsed: boolean;
  navSections: SidebarNavSection[];
};

const AccountAvatar = ({ user }: { user: AdminUser }) => (
  <div className="size-9 shrink-0 overflow-hidden rounded-full">
    <div
      className="flex size-full items-center justify-center bg-cover bg-center"
      style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
    >
      {!user.avatarUrl && (
        <span
          aria-hidden
          className="flex size-full items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: getAvatarColor(user.id) }}
        >
          {initialsFor(user.name)}
        </span>
      )}
    </div>
  </div>
);

export const AdminSidebarAccount = ({
  user,
  accountLabel,
  collapsed,
  navSections,
}: AdminSidebarAccountProps) => (
  <div className={cn("flex min-w-0 flex-1 flex-col gap-3", collapsed && "items-center")}>
    <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
      <AccountAvatar user={user} />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground" title={user.name}>
            {user.name}
          </p>
          {user.isCoFounder ? (
            <Badge tone="positive" showDot={false} className="mt-1 px-2 py-0.5 text-[10px]">
              Co-founder
            </Badge>
          ) : (
            <p className="truncate text-[11px] text-muted-foreground" title={accountLabel}>
              {accountLabel}
            </p>
          )}
        </div>
      )}
    </div>
    {!collapsed && <AdminModuleSearch sections={navSections} />}
  </div>
);
