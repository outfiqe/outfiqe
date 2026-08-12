import {
  ClipboardList,
  GalleryHorizontal,
  Layers,
  Package,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import {
  Sidebar,
  sidebarWidthClass,
  useSidebarCollapse,
  type SidebarNavSection,
} from "@outfiqe/components";
import { cn } from "@outfiqe/design-system";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";

import { useAuth } from "@/features/auth/AuthContext";
import { useTanStackSidebarNavigation } from "./useTanStackSidebarNavigation";

const NAV_SECTIONS: SidebarNavSection[] = [
  {
    id: "admin",
    items: [
      { id: "brand-applications", href: "/", label: "Brand applications", icon: ClipboardList },
      { id: "products", href: "/products", label: "Products", icon: Package },
      { id: "collections", href: "/collections", label: "Collections", icon: Layers },
      { id: "categories", href: "/categories", label: "Categories", icon: Tags },
      { id: "hero-slides", href: "/hero-slides", label: "Hero slides", icon: GalleryHorizontal },
      { id: "creators", href: "/creators", label: "Creators", icon: Users },
      { id: "team", href: "/team", label: "Team", icon: UserCog },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useAuth();
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:admin-sidebar-collapsed");

  const user = state.status === "signed-in" ? state.user : null;

  const header = user && (
    <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
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
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground" title={user.name}>
            {user.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">Admin account</p>
        </div>
      )}
    </div>
  );

  return (
    <Sidebar
      sections={NAV_SECTIONS}
      navigation={navigation}
      ariaLabel="Admin"
      collapsed={collapsed}
      onToggleCollapse={toggle}
      header={header}
      className={`shrink-0 ${sidebarWidthClass(collapsed)}`}
    />
  );
}
