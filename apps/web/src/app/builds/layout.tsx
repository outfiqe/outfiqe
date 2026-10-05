import { DashboardMobileNavBar } from "@/components/DashboardMobileNavBar";
import { SiteHeader } from "@/components/SiteHeader";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

const BuildsLayout = ({ children }: { children: React.ReactNode }) => (
  <div>
    <SiteHeader />
    <TranslationsProvider>{children}</TranslationsProvider>
    <DashboardMobileNavBar />
  </div>
);

export default BuildsLayout;
