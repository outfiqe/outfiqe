"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";

import type { PublicBuildFilters } from "../api/outfitSocialSchemas";
import { PublicBuildsFeed } from "./PublicBuildsFeed";

const PRIMARY_TAB = "primary";
const BUILDS_TAB = "builds";

type ProfileBuildsTabsProps = {
  primaryLabel: string;
  buildFilters: Pick<PublicBuildFilters, "contributorId" | "brandId">;
  children: ReactNode;
};

const TabsWithBuilds = ({ primaryLabel, buildFilters, children }: ProfileBuildsTabsProps) => {
  const t = useTranslations("outfitBuild.public");
  return (
    <Tabs defaultValue={PRIMARY_TAB}>
      <TabsList className="mb-4">
        <TabsTrigger value={PRIMARY_TAB}>{primaryLabel}</TabsTrigger>
        <TabsTrigger value={BUILDS_TAB}>{t("buildsTab")}</TabsTrigger>
      </TabsList>
      <TabsContent value={PRIMARY_TAB}>{children}</TabsContent>
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
