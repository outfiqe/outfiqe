import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { Breadcrumb } from "@/shared/seo";
import { Breadcrumbs } from "@/shared/seo";

interface MarketingShellProps {
  breadcrumbs: Breadcrumb[];
  children: React.ReactNode;
  width?: "prose" | "wide";
}

export const MarketingShell = ({ breadcrumbs, children, width = "wide" }: MarketingShellProps) => (
  <div className="pb-20 lg:pb-0">
    <SiteHeader />
    <main
      className={`mx-auto px-6 pb-20 pt-6 sm:pt-10 lg:px-10 ${
        width === "prose" ? "max-w-3xl" : "max-w-5xl"
      }`}
    >
      <Breadcrumbs crumbs={breadcrumbs} className="mb-6" />
      {children}
    </main>
    <SiteFooter />
    <MobileTabBar />
  </div>
);
