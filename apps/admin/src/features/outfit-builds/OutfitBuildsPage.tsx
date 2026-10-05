import {
  Badge,
  Button,
  FormBanner,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { useAdminBuilds } from "./api";
import { BuildMetricsSection } from "./BuildMetricsSection";
import {
  type AdminBuildFilter,
  BUILD_STATUSES,
  BUILD_VISIBILITIES,
  type BuildStatus,
  type BuildVisibility,
} from "./schemas";

const SKELETON_ROW_COUNT = 5;
const NO_BUILDS = 0;
const ANY_VALUE = "";
const BUILDS_TAB = { LIST: "list", METRICS: "metrics" } as const;

const isBuildStatus = (value: string): value is BuildStatus =>
  BUILD_STATUSES.some((status) => status === value);

const isBuildVisibility = (value: string): value is BuildVisibility =>
  BUILD_VISIBILITIES.some((visibility) => visibility === value);

const BuildList = () => {
  const searchFieldId = useId();
  const statusFieldId = useId();
  const visibilityFieldId = useId();
  const [searchText, setSearchText] = useState("");
  const [statusValue, setStatusValue] = useState(ANY_VALUE);
  const [visibilityValue, setVisibilityValue] = useState(ANY_VALUE);
  const [filter, setFilter] = useState<AdminBuildFilter>({});
  const builds = useAdminBuilds(filter);
  const buildRows = builds.data?.pages.flatMap((page) => page.items) ?? [];

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedSearch = searchText.trim();
    setFilter({
      search: trimmedSearch === "" ? undefined : trimmedSearch,
      status: isBuildStatus(statusValue) ? statusValue : undefined,
      visibility: isBuildVisibility(visibilityValue) ? visibilityValue : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={searchFieldId} className="text-xs text-muted-foreground">
            Title or owner
          </label>
          <Input
            id={searchFieldId}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={statusFieldId} className="text-xs text-muted-foreground">
            Status
          </label>
          <Select
            id={statusFieldId}
            value={statusValue}
            onChange={(event) => setStatusValue(event.target.value)}
          >
            <option value={ANY_VALUE}>Any status</option>
            {BUILD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor={visibilityFieldId} className="text-xs text-muted-foreground">
            Who can see it
          </label>
          <Select
            id={visibilityFieldId}
            value={visibilityValue}
            onChange={(event) => setVisibilityValue(event.target.value)}
          >
            <option value={ANY_VALUE}>Anyone</option>
            {BUILD_VISIBILITIES.map((visibility) => (
              <option key={visibility} value={visibility}>
                {visibility}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {builds.isLoading &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <CardRowSkeleton key={index} textLineCount={2} />
        ))}
      {builds.error && <FormBanner>{getErrorMessage(builds.error)}</FormBanner>}
      {!builds.isLoading && !builds.error && buildRows.length === NO_BUILDS && (
        <p className="text-sm text-muted-foreground">No builds match.</p>
      )}

      <ul className="space-y-3">
        {buildRows.map((build) => (
          <li key={build.id}>
            <Link
              to="/outfit-builds/$outfitId"
              params={{ outfitId: build.id }}
              className="block cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground focus-visible:border-foreground"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{build.title ?? "Untitled build"}</p>
                <Badge tone="neutral" showDot={false}>
                  {build.status}
                </Badge>
                <Badge tone="neutral" showDot={false}>
                  {build.visibility}
                </Badge>
                {build.removedAt && (
                  <Badge tone="negative" showDot={false}>
                    Removed
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {build.owner ? `${build.owner.name} (@${build.owner.handle})` : "No owner"} ·{" "}
                {build.memberCount} people · {build.itemCount} items · {build.photoCount} photos ·{" "}
                {build.likeCount} likes · {build.commentCount} comments
                {build.isStartedInChat ? " · started in a chat" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(build.updatedAt).toLocaleString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {builds.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void builds.fetchNextPage()}
          isLoading={builds.isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </div>
  );
};

export const OutfitBuildsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Outfit builds</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Look up any build, see its history, and unlock or archive it when needed.
      </p>
    </div>
    <Tabs defaultValue={BUILDS_TAB.LIST}>
      <TabsList>
        <TabsTrigger value={BUILDS_TAB.LIST}>Builds</TabsTrigger>
        <TabsTrigger value={BUILDS_TAB.METRICS}>Metrics</TabsTrigger>
      </TabsList>
      <TabsContent value={BUILDS_TAB.LIST} className="mt-4">
        <BuildList />
      </TabsContent>
      <TabsContent value={BUILDS_TAB.METRICS} className="mt-4">
        <BuildMetricsSection />
      </TabsContent>
    </Tabs>
  </div>
);
