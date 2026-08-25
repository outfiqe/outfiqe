import {
  Sidebar,
  type SidebarNavSection,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import { cn } from "@outfiqe/design-system";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";
import {
  Award,
  BanknoteArrowUp,
  Building2,
  ClipboardList,
  Crown,
  GalleryHorizontal,
  Handshake,
  Landmark,
  Layers,
  MapPin,
  Package,
  Percent,
  PiggyBank,
  Ruler,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tags,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";

import { useTanStackSidebarNavigation } from "./useTanStackSidebarNavigation";

const CRM_NAV_SECTIONS: SidebarNavSection[] = [
  {
    id: "crm",
    items: [{ id: "crm", href: "/crm", label: "CRM", icon: Handshake }],
  },
];

const PLATFORM_NAV_SECTIONS: SidebarNavSection[] = [
  {
    id: "admin",
    items: [
      { id: "brand-applications", href: "/", label: "Brand applications", icon: ClipboardList },
      { id: "products", href: "/products", label: "Products", icon: Package },
      { id: "collections", href: "/collections", label: "Collections", icon: Layers },
      { id: "categories", href: "/categories", label: "Categories", icon: Tags },
      { id: "size-options", href: "/size-options", label: "Sizes", icon: Ruler },
      { id: "hero-slides", href: "/hero-slides", label: "Hero slides", icon: GalleryHorizontal },
      { id: "orders", href: "/orders", label: "Orders", icon: ShoppingBag },
      { id: "product-reviews", href: "/product-reviews", label: "Product Reviews", icon: Star },
      { id: "trending", href: "/trending", label: "Trending debug", icon: TrendingUp },
      { id: "creators", href: "/creators", label: "Creators", icon: Users },
      { id: "commissions", href: "/commissions", label: "Commissions", icon: Wallet },
      {
        id: "platform-commission",
        href: "/platform-commission",
        label: "Platform commission",
        icon: Percent,
      },
      {
        id: "withdraw-requests",
        href: "/withdraw-requests",
        label: "Withdrawal requests",
        icon: BanknoteArrowUp,
      },
      {
        id: "withdraw-policy",
        href: "/withdraw-policy",
        label: "Withdrawal policy",
        icon: Landmark,
      },
      {
        id: "financial-rollup",
        href: "/financial-rollup",
        label: "Financial rollup",
        icon: PiggyBank,
      },
      {
        id: "gamification",
        href: "/gamification",
        label: "Gamification",
        icon: Trophy,
        items: [
          {
            id: "gamification-xp-levels",
            href: "/gamification/xp-levels",
            label: "XP & Levels",
            icon: Zap,
          },
          {
            id: "gamification-badges",
            href: "/gamification/badges",
            label: "Badges & Challenges",
            icon: Award,
          },
          {
            id: "gamification-leaderboards",
            href: "/gamification/leaderboards",
            label: "Leaderboards",
            icon: Crown,
          },
          {
            id: "gamification-manual-actions",
            href: "/gamification/manual-actions",
            label: "Manual Actions",
            icon: SlidersHorizontal,
          },
        ],
      },
      { id: "delivery-zones", href: "/delivery-zones", label: "Delivery zones", icon: MapPin },
      { id: "organizations", href: "/organizations", label: "Organizations", icon: Building2 },
      { id: "team", href: "/team", label: "Team", icon: UserCog },
    ],
  },
];

export const AdminSidebar = () => {
  const { state } = useAuth();
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:admin-sidebar-collapsed");

  const user = state.status === "signed-in" ? state.user : null;
  const navSections = user?.hasPlatformAccess
    ? [...CRM_NAV_SECTIONS, ...PLATFORM_NAV_SECTIONS]
    : CRM_NAV_SECTIONS;

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
      sections={navSections}
      navigation={navigation}
      ariaLabel="Admin"
      collapsed={collapsed}
      onToggleCollapse={toggle}
      header={header}
      className={`shrink-0 ${sidebarWidthClass(collapsed)}`}
    />
  );
};
