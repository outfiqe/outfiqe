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
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:admin-sidebar-collapsed");

  return (
    <Sidebar
      sections={NAV_SECTIONS}
      navigation={navigation}
      ariaLabel="Admin"
      collapsed={collapsed}
      onToggleCollapse={toggle}
      className={`shrink-0 ${sidebarWidthClass(collapsed)}`}
    />
  );
}
