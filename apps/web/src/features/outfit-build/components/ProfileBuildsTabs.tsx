"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import { useTabSearchParam } from "@/shared/hooks/useTabSearchParam";

import type { PublicBuildFilters } from "../api/outfitSocialSchemas";
import { PublicBuildsFeed } from "./PublicBuildsFeed";

const BUILDS_TAB = "builds";

type ProfileBuildsTabsProps = {
  primaryTab: string;
  primaryLabel: string;
  buildFilters: Pick<PublicBuildFilters, "contributorId" | "brandId">;
  children: ReactNode;
};

const TabsWithBuilds = ({
  primaryTab,
  primaryLabel,
  buildFilters,
  children,
}: ProfileBuildsTabsProps) => {
  const t = useTranslations("outfitBuild.public");
  const { selectedTab, selectTab } = useTabSearchParam([primaryTab, BUILDS_TAB], primaryTab);
  return (
    <Tabs value={selectedTab} onValueChange={selectTab}>
      <TabsList className="mb-4">
        <TabsTrigger value={primaryTab}>{primaryLabel}</TabsTrigger>
        <TabsTrigger value={BUILDS_TAB}>{t("buildsTab")}</TabsTrigger>
      </TabsList>
      <TabsContent value={primaryTab}>{children}</TabsContent>
      <TabsContent value={BUILDS_TAB}>
        <PublicBuildsFeed fixedFilters={buildFilters} showFilters={false} />
      </TabsContent>
    </Tabs>
  );
};

export const ProfileBuildsTabs = (props: ProfileBuildsTabsProps) => {
  const isPublicBuildsOn = useFeatureFlag("outfit_public_feed");
  return isPublicBuildsOn ? <TabsWithBuilds {...props} /> : <>{props.children}</>;
};
