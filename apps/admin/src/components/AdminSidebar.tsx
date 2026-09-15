import {
  Sidebar,
  type SidebarIcon,
  type SidebarNavItem,
  type SidebarNavSection,
  SidebarSkeleton,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import { Badge, cn } from "@outfiqe/design-system";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BanknoteArrowUp,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Crown,
  Fingerprint,
  Flag,
  GalleryHorizontal,
  Gauge,
  IdCard,
  Images,
  KanbanSquare,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  MapPin,
  Megaphone,
  MessageSquareWarning,
  Package,
  Percent,
  PiggyBank,
  Ruler,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tags,
  TicketPercent,
  TrendingUp,
  Trophy,
  UserCog,
  UserRound,
  Users,
  VenetianMask,
  Wallet,
  Zap,
} from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import { crmApi } from "@/features/crm/api";

import {
  groupPlatformNavItems,
  isAdminNavReady,
  isCrmSubItemVisible,
  type PlatformNavGroupKey,
  type PlatformNavItem,
  resolveAccountLabel,
  shouldShowCrmSection,
  shouldShowPlatformSection,
} from "./AdminSidebar.utils";
import { useTanStackSidebarNavigation } from "./useTanStackSidebarNavigation";

type CrmSubItem = SidebarNavItem & { permissionKey: string | null; requiresLinkedBrand?: boolean };

const CRM_SUB_ITEMS: CrmSubItem[] = [
  { id: "crm-overview", href: "/crm", label: "Overview", icon: LayoutGrid, permissionKey: null },
  {
    id: "crm-partners",
    href: "/crm/partners",
    label: "Partners",
    icon: Users,
    permissionKey: "accounts:read",
    requiresLinkedBrand: true,
  },
  {
    id: "crm-customers",
    href: "/crm/customers",
    label: "Customers",
    icon: UserRound,
    permissionKey: "customers:read",
    requiresLinkedBrand: true,
  },
  {
    id: "crm-contacts",
    href: "/crm/contacts",
    label: "Contacts",
    icon: IdCard,
    permissionKey: "contacts:read",
  },
  {
    id: "crm-pipeline",
    href: "/crm/pipeline",
    label: "Pipeline",
    icon: KanbanSquare,
    permissionKey: "pipeline:read",
  },
  {
    id: "crm-tasks",
    href: "/crm/tasks",
    label: "Tasks",
    icon: ListChecks,
    permissionKey: "tasks:read",
  },
  {
    id: "crm-support",
    href: "/crm/support",
    label: "Support",
    icon: LifeBuoy,
    permissionKey: "tickets:read",
  },
  {
    id: "crm-reports",
    href: "/crm/reports",
    label: "Reports",
    icon: BarChart3,
    permissionKey: "reports:read",
  },
  {
    id: "crm-roles",
    href: "/crm/roles",
    label: "Roles",
    icon: ShieldCheck,
    permissionKey: "roles:read",
  },
  {
    id: "crm-audit",
    href: "/crm/audit",
    label: "Audit",
    icon: ScrollText,
    permissionKey: "audit:read",
  },
  {
    id: "crm-billing",
    href: "/crm/billing",
    label: "Billing",
    icon: CreditCard,
    permissionKey: "billing:read",
    requiresLinkedBrand: true,
  },
];

const toNavItem = ({
  permissionKey: _permissionKey,
  requiresLinkedBrand: _requiresLinkedBrand,
  ...item
}: CrmSubItem): SidebarNavItem => item;

const PLATFORM_OVERVIEW_NAV_ITEM: SidebarNavItem = {
  id: "platform-overview",
  href: "/platform",
  label: "Overview",
  icon: LayoutDashboard,
};

const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  {
    id: "brand-applications",
    href: "/platform/brand-applications",
    label: "Brand applications",
    icon: ClipboardList,
    group: "brand-tenants",
  },
  {
    id: "platform-metrics",
    href: "/platform/metrics",
    label: "Tenant metrics",
    icon: Gauge,
    group: "brand-tenants",
  },
  {
    id: "platform-features",
    href: "/platform/features",
    label: "Feature flags",
    icon: SlidersHorizontal,
    group: "platform-settings",
  },
  {
    id: "platform-impersonation",
    href: "/platform/impersonation",
    label: "Impersonation",
    icon: VenetianMask,
    group: "brand-tenants",
  },
  {
    id: "platform-nav-access",
    href: "/platform/nav-access",
    label: "Navigation access",
    icon: Fingerprint,
    group: "platform-settings",
    coFounderOnly: true,
  },
  { id: "products", href: "/products", label: "Products", icon: Package, group: "catalog" },
  {
    id: "collections",
    href: "/collections",
    label: "Collections",
    icon: Layers,
    group: "catalog",
  },
  { id: "categories", href: "/categories", label: "Categories", icon: Tags, group: "catalog" },
  {
    id: "product-types",
    href: "/product-types",
    label: "Garment types",
    icon: Shirt,
    group: "catalog",
  },
  { id: "size-options", href: "/size-options", label: "Sizes", icon: Ruler, group: "catalog" },
  {
    id: "hero-slides",
    href: "/hero-slides",
    label: "Hero slides",
    icon: GalleryHorizontal,
    group: "catalog",
  },
  { id: "orders", href: "/orders", label: "Orders", icon: ShoppingBag, group: "commerce" },
  {
    id: "support",
    href: "/support",
    label: "Support requests",
    icon: LifeBuoy,
    group: "moderation",
  },
  {
    id: "product-reviews",
    href: "/product-reviews",
    label: "Product Reviews",
    icon: Star,
    group: "moderation",
  },
  {
    id: "tag-reviews",
    href: "/tag-reviews",
    label: "Tag reviews",
    icon: ListChecks,
    group: "moderation",
  },
  {
    id: "tag-reports",
    href: "/tag-reports",
    label: "Tag reports",
    icon: Flag,
    group: "moderation",
  },
  {
    id: "content-reports",
    href: "/content-reports",
    label: "Content reports",
    icon: MessageSquareWarning,
    group: "moderation",
  },
  {
    id: "content-browser",
    href: "/content-browser",
    label: "Browse posts",
    icon: Images,
    group: "moderation",
  },
  {
    id: "trending",
    href: "/trending",
    label: "Trending debug",
    icon: TrendingUp,
    group: "growth",
  },
  { id: "users", href: "/users", label: "Users", icon: ShieldAlert, group: "moderation" },
  { id: "creators", href: "/creators", label: "Creators", icon: Users, group: "growth" },
  {
    id: "commissions",
    href: "/commissions",
    label: "Commissions",
    icon: Wallet,
    group: "finance",
  },
  {
    id: "platform-commission",
    href: "/platform-commission",
    label: "Platform commission",
    icon: Percent,
    group: "finance",
  },
  {
    id: "withdraw-requests",
    href: "/withdraw-requests",
    label: "Withdrawal requests",
    icon: BanknoteArrowUp,
    group: "finance",
  },
  {
    id: "withdraw-policy",
    href: "/withdraw-policy",
    label: "Withdrawal policy",
    icon: Landmark,
    group: "finance",
  },
  {
    id: "financial-rollup",
    href: "/financial-rollup",
    label: "Financial rollup",
    icon: PiggyBank,
    group: "finance",
  },
  {
    id: "coupons",
    href: "/coupons",
    label: "Coupons",
    icon: TicketPercent,
    group: "commerce",
  },
  {
    id: "announcements",
    href: "/announcements",
    label: "Announcements",
    icon: Megaphone,
    group: "growth",
  },
  {
    id: "gamification",
    href: "/gamification",
    label: "Gamification",
    icon: Trophy,
    group: "growth",
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
  {
    id: "delivery-zones",
    href: "/delivery-zones",
    label: "Delivery zones",
    icon: MapPin,
    group: "commerce",
  },
  {
    id: "organizations",
    href: "/organizations",
    label: "Organizations",
    icon: Building2,
    group: "brand-tenants",
  },
  { id: "team", href: "/team", label: "Team", icon: UserCog, group: "brand-tenants" },
];

const PLATFORM_NAV_GROUP_ICONS: Record<PlatformNavGroupKey, SidebarIcon> = {
  "brand-tenants": Building2,
  catalog: LayoutGrid,
  commerce: ShoppingBag,
  moderation: ShieldAlert,
  finance: Wallet,
  growth: TrendingUp,
  "platform-settings": SlidersHorizontal,
};

const SIDEBAR_SKELETON_ROW_COUNT = 8;

export const AdminSidebar = () => {
  const { state } = useAuth();
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:admin-sidebar-collapsed");

  const { data: crmOrganization, status: crmOrganizationStatus } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!isAdminNavReady(state.status !== "loading", crmOrganizationStatus)) {
    return (
      <SidebarSkeleton
        ariaLabel="Admin"
        collapsed={collapsed}
        rowCount={SIDEBAR_SKELETON_ROW_COUNT}
        className={cn("shrink-0", sidebarWidthClass(collapsed))}
      />
    );
  }

  const visibleCrmItems = CRM_SUB_ITEMS.filter((item) =>
    isCrmSubItemVisible(item, crmOrganization),
  ).map(toNavItem);

  const user = state.status === "signed-in" ? state.user : null;
  const isCoFounder = user?.isCoFounder ?? false;
  const accountLabel = resolveAccountLabel({
    hasPlatformAccess: user?.hasPlatformAccess ?? false,
    crmRoleName: crmOrganization?.viewerRoleName,
  });
  const platformNavItems: SidebarNavItem[] = [
    PLATFORM_OVERVIEW_NAV_ITEM,
    ...groupPlatformNavItems(
      PLATFORM_NAV_ITEMS,
      { isCoFounder, hiddenNavKeys: user?.hiddenPlatformNavKeys ?? [] },
      PLATFORM_NAV_GROUP_ICONS,
    ),
  ];
  const navSections: SidebarNavSection[] = [
    ...(shouldShowCrmSection(crmOrganization)
      ? [{ id: "crm", label: "CRM", items: visibleCrmItems }]
      : []),
    ...(shouldShowPlatformSection(user?.hasPlatformAccess ?? false, crmOrganization)
      ? [{ id: "platform", label: "Platform", items: platformNavItems }]
      : []),
  ];

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
          {isCoFounder ? (
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
