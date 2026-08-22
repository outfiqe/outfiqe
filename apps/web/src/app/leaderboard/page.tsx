import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  LeaderboardInfoSection,
  LeaderboardListSkeleton,
  LeaderboardView,
} from "@/features/leaderboard";

export const metadata: Metadata = { title: "Brand leaderboard" };

const LeaderboardPage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
            Weekly rankings
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
            Brand leaderboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Who&apos;s leading this week, by category. Resets every Monday.
          </p>
          <Link
            href="/leaderboard/creators"
            className="mt-3 inline-block text-sm font-semibold text-primary-strong hover:underline"
          >
            View the creator leaderboard →
          </Link>

          <div className="mt-8">
            <Suspense fallback={<LeaderboardListSkeleton />}>
              <LeaderboardView />
            </Suspense>
          </div>

          <div className="mt-16">
            <LeaderboardInfoSection />
          </div>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default LeaderboardPage;
