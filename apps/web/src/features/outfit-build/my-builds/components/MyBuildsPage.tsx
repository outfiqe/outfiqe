"use client";

import {
  Button,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@outfiqe/design-system";
import { generateUuid } from "@outfiqe/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useTabSearchParam } from "@/shared/hooks/useTabSearchParam";
import { ApiClientError } from "@/shared/lib/apiClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { outfitApi } from "../../api/outfitApi";
import type { OutfitSummaryPage } from "../../api/outfitSchemas";
import { useBuildsSharedWithMe, useMyBuilds } from "../hooks/useMyBuilds";
import { buildPath, BuildSummaryCard } from "./BuildSummaryCard";

const SKELETON_CARD_COUNT = 4;
const NO_BUILDS = 0;

const MY_BUILDS_TAB = {
  MINE: "mine",
  SHARED: "shared",
} as const;

const MY_BUILDS_TABS = [MY_BUILDS_TAB.MINE, MY_BUILDS_TAB.SHARED];
const FEATURE_NOT_AVAILABLE_CODE = "FEATURE_NOT_AVAILABLE";

type BuildListQuery = ReturnType<typeof useMyBuilds>;

const isFeatureOff = (error: unknown) =>
  error instanceof ApiClientError && error.code === FEATURE_NOT_AVAILABLE_CODE;

const BuildGrid = ({ query, emptyText }: { query: BuildListQuery; emptyText: string }) => {
  const t = useTranslations("outfitBuild.myBuilds");
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  const builds = data?.pages.flatMap((page: OutfitSummaryPage) => page.items) ?? [];

  if (isPending) {
    return (
      <div aria-busy className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
          <Skeleton key={index} className="aspect-[3/4] w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("loadFailed")}
      </p>
    );
  }
  if (builds.length === NO_BUILDS) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {builds.map((build) => (
          <li key={build.id}>
            <BuildSummaryCard build={build} />
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          isLoading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      )}
    </>
  );
};

export const MyBuildsPage = () => {
  const t = useTranslations("outfitBuild.myBuilds");
  const router = useRouter();
  const myBuilds = useMyBuilds();
  const sharedBuilds = useBuildsSharedWithMe();
  const { selectedTab, selectTab } = useTabSearchParam(MY_BUILDS_TABS, MY_BUILDS_TAB.MINE);
  const [isStarting, setIsStarting] = useState(false);

  const startBuild = async () => {
    setIsStarting(true);
    try {
      const board = await outfitApi.start({}, generateUuid());
      router.push(buildPath(board.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
      setIsStarting(false);
    }
  };

  if (isFeatureOff(myBuilds.error)) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("comingSoon")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => void startBuild()} isLoading={isStarting}>
          {t("newBuild")}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={selectTab}>
        <TabsList>
          <TabsTrigger value={MY_BUILDS_TAB.MINE}>{t("tabs.mine")}</TabsTrigger>
          <TabsTrigger value={MY_BUILDS_TAB.SHARED}>{t("tabs.shared")}</TabsTrigger>
        </TabsList>
        <TabsContent value={MY_BUILDS_TAB.MINE} className="mt-4">
          <BuildGrid query={myBuilds} emptyText={t("emptyMine")} />
        </TabsContent>
        <TabsContent value={MY_BUILDS_TAB.SHARED} className="mt-4">
          <BuildGrid query={sharedBuilds} emptyText={t("emptyShared")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
