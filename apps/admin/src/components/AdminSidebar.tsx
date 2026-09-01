import {
  Sidebar,
  type SidebarNavItem,
  type SidebarNavSection,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import { cn } from "@outfiqe/design-system";
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
  GalleryHorizontal,
  Gauge,
  IdCard,
  KanbanSquare,
  Landmark,
  Layers,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  MapPin,
  Package,
  Percent,
  PiggyBank,
  Ruler,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tags,
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
  isCrmSubItemVisible,
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

const PLATFORM_NAV_ITEMS: SidebarNavSection["items"] = [
  { id: "brand-applications", href: "/", label: "Brand applications", icon: ClipboardList },
  { id: "platform-metrics", href: "/platform/metrics", label: "Tenant metrics", icon: Gauge },
  {
    id: "platform-features",
    href: "/platform/features",
    label: "Feature flags",
    icon: SlidersHorizontal,
  },
  {
    id: "platform-impersonation",
    href: "/platform/impersonation",
    label: "Impersonation",
    icon: VenetianMask,
  },
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
];

export const AdminSidebar = () => {
  const { state } = useAuth();
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:admin-sidebar-collapsed");

  const { data: crmOrganization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const visibleCrmItems = CRM_SUB_ITEMS.filter((item) =>
    isCrmSubItemVisible(item, crmOrganization),
  ).map(toNavItem);

  const user = state.status === "signed-in" ? state.user : null;
  const navSections: SidebarNavSection[] = [
    ...(shouldShowCrmSection(crmOrganization)
      ? [{ id: "crm", label: "CRM", items: visibleCrmItems }]
      : []),
    ...(shouldShowPlatformSection(user?.hasPlatformAccess ?? false, crmOrganization)
      ? [{ id: "platform", label: "Platform", items: PLATFORM_NAV_ITEMS }]
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
