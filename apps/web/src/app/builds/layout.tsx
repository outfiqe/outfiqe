import { DashboardMobileNavBar } from "@/components/DashboardMobileNavBar";
import { DashboardShell } from "@/components/DashboardShell";
import { SiteHeader } from "@/components/SiteHeader";
import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

const BuildsLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSessionWithToken();

  if (session) {
    return (
      <DashboardShell>
        <TranslationsProvider>{children}</TranslationsProvider>
      </DashboardShell>
    );
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-32 lg:pb-8">
        <TranslationsProvider>{children}</TranslationsProvider>
      </main>
      <DashboardMobileNavBar />
    </div>
  );
};

export default BuildsLayout;
