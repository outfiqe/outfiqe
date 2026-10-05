import { DashboardMobileNavBar } from "@/components/DashboardMobileNavBar";
import { SiteHeader } from "@/components/SiteHeader";
import { LanguageSwitch } from "@/i18n/LanguageSwitch";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

const BuildsLayout = ({ children }: { children: React.ReactNode }) => (
  <div>
    <SiteHeader />
    <TranslationsProvider>{children}</TranslationsProvider>
    <footer className="flex justify-center border-t border-border px-6 py-4 pb-24 lg:pb-4">
      <LanguageSwitch />
    </footer>
    <DashboardMobileNavBar />
  </div>
);

export default BuildsLayout;
