import { DashboardShell } from "@/components/DashboardShell";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { isBuildMemberServer } from "@/features/outfit-build/board/api/isBuildMemberServer";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

type BuildLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ outfitId: string }>;
};

const BuildLayout = async ({ children, params }: BuildLayoutProps) => {
  const { outfitId } = await params;
  const session = await getServerSessionWithToken();
  const isMember = session ? await isBuildMemberServer(outfitId, session.accessToken) : false;

  if (isMember) {
    return (
      <DashboardShell>
        <TranslationsProvider>{children}</TranslationsProvider>
      </DashboardShell>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <TranslationsProvider>{children}</TranslationsProvider>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default BuildLayout;
