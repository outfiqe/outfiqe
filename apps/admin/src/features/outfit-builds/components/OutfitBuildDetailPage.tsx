import { Badge, Button, FormBanner } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";

import {
  ADMIN_BUILD_HISTORY_QUERY_KEY,
  ADMIN_BUILD_QUERY_KEY,
  ADMIN_BUILDS_QUERY_KEY,
  outfitBuildsApi,
  useAdminBuildHistory,
} from "../api/outfitBuildsApi";
import type { AdminBuildAction, AdminBuildDetail } from "../api/outfitBuildsSchemas";

const SKELETON_ROW_COUNT = 4;
const NOTHING = 0;
const BUILDS_MANAGE_PERMISSION = "platform:builds:manage";

const ACTION_COPY: Record<AdminBuildAction, { button: string; title: string; label: string }> = {
  unlock: {
    button: "Unlock build",
    title: "Unlock this build",
    label: "Why are you unlocking it? Members will see the build as a draft again.",
  },
  archive: {
    button: "Archive build",
    title: "Archive this build",
    label: "Why are you archiving it? Nobody can change it afterwards.",
  },
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2 rounded-xl border border-border bg-card p-4">
    <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
    {children}
  </section>
);

const EmptyLine = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground">{text}</p>
);

const actionsFor = ({ status }: AdminBuildDetail): AdminBuildAction[] => {
  if (status === "LOCKED") return ["unlock", "archive"];
  if (status === "DRAFT") return ["archive"];
  return [];
};

const BuildHistory = ({ outfitId }: { outfitId: string }) => {
  const history = useAdminBuildHistory(outfitId);
  const events = history.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Section title="History">
      {history.isLoading && <CardRowSkeleton textLineCount={2} />}
      {history.error && <FormBanner>{getErrorMessage(history.error)}</FormBanner>}
      {!history.isLoading && events.length === NOTHING && <EmptyLine text="No changes yet." />}
      <ol className="space-y-1 text-sm">
        {events.map((event) => (
          <li key={event.version} className="text-foreground">
            <span className="font-medium">v{event.version}</span> {event.type}
            <span className="text-muted-foreground">
              {" "}
              by {event.actor?.name ?? "someone no longer here"} ·{" "}
              {new Date(event.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
      {history.hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void history.fetchNextPage()}
          isLoading={history.isFetchingNextPage}
        >
          Show older changes
        </Button>
      )}
    </Section>
  );
};

export const OutfitBuildDetailPage = ({ outfitId }: { outfitId: string }) => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(BUILDS_MANAGE_PERMISSION);
  const [pendingAction, setPendingAction] = useState<AdminBuildAction | null>(null);
  const build = useQuery({
    queryKey: [ADMIN_BUILD_QUERY_KEY, outfitId],
    queryFn: () => outfitBuildsApi.get(outfitId),
  });
  const act = useApiMutation({
    successMessage: "Build updated.",
    mutationFn: ({ action, reason }: { action: AdminBuildAction; reason: string }) =>
      outfitBuildsApi.act(outfitId, action, reason),
    invalidateKeys: [
      [ADMIN_BUILD_QUERY_KEY, outfitId],
      [ADMIN_BUILD_HISTORY_QUERY_KEY, outfitId],
      [ADMIN_BUILDS_QUERY_KEY],
    ],
    onSuccess: () => setPendingAction(null),
  });
  const pendingCopy = pendingAction ? ACTION_COPY[pendingAction] : null;

  if (build.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <CardRowSkeleton key={index} textLineCount={3} />
        ))}
      </div>
    );
  }
  if (build.error || !build.data) {
    return <FormBanner>{getErrorMessage(build.error)}</FormBanner>;
  }

  const detail = build.data;
  return (
    <div className="space-y-4">
      <Link
        to="/outfit-builds"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        All builds
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {detail.title ?? "Untitled build"}
          </h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone="neutral" showDot={false}>
              {detail.status}
            </Badge>
            <Badge tone="neutral" showDot={false}>
              {detail.visibility}
            </Badge>
            <Badge tone="neutral" showDot={false}>
              Version {detail.version}
            </Badge>
            {detail.openReportCount > NOTHING && (
              <Badge tone="negative" showDot={false}>
                {detail.openReportCount} open reports
              </Badge>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {actionsFor(detail).map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === "archive" ? "outline" : "default"}
                disabled={act.isPending}
                onClick={() => setPendingAction(action)}
              >
                {ACTION_COPY[action].button}
              </Button>
            ))}
          </div>
        )}
      </header>
      {act.isError && <FormBanner>{getErrorMessage(act.error)}</FormBanner>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="People">
          <ul className="space-y-1 text-sm">
            {detail.members.map(({ user, role, isHappy }) => (
              <li key={user.id} className="text-foreground">
                {user.name} <span className="text-muted-foreground">@{user.handle}</span> · {role}
                {isHappy ? " · happy" : ""}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Items on the board">
          {detail.items.length === NOTHING && <EmptyLine text="No items on the board." />}
          <ul className="space-y-1 text-sm">
            {detail.items.map((item) => (
              <li key={`${item.slotLabel}-${item.position}`} className="text-foreground">
                {item.slotLabel}: {item.productName} · Rs. {item.price}
                <span className="text-muted-foreground">
                  {" "}
                  · added by {item.addedBy?.name ?? "someone no longer here"}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Locked versions">
          {detail.versions.length === NOTHING && <EmptyLine text="Never locked." />}
          <ul className="space-y-1 text-sm">
            {detail.versions.map((version) => (
              <li key={version.version} className="text-foreground">
                v{version.version} · {version.itemCount} items · Rs. {version.total} ·{" "}
                {new Date(version.lockedAt).toLocaleString()}
                {version.version === detail.publishedVersion ? " · shown to viewers" : ""}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="What viewers see">
          {detail.publishedItems.length === NOTHING && <EmptyLine text="Not shared or public." />}
          <ul className="space-y-1 text-sm">
            {detail.publishedItems.map((item) => (
              <li key={`${item.slotLabel}-${item.position}`} className="text-foreground">
                {item.slotLabel}: {item.productName} · {item.brandName} · Rs. {item.unitPrice}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Looks dropped from this build">
          {detail.looks.length === NOTHING && <EmptyLine text="No looks yet." />}
          <ul className="space-y-1 text-sm">
            {detail.looks.map((look) => (
              <li key={look.id} className="text-foreground">
                {look.creator.name} · from v{look.sourceVersion} ·{" "}
                {new Date(look.createdAt).toLocaleDateString()}
                {look.isDeleted ? " · deleted" : ""}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Photos">
          {detail.photos.length === NOTHING && <EmptyLine text="No photos." />}
          <ul className="grid grid-cols-3 gap-2">
            {detail.photos.map((photo) => (
              <li key={photo.id} className="space-y-1 text-xs text-muted-foreground">
                <img
                  src={photo.imageUrl}
                  alt={`Photo added by ${photo.uploadedBy?.name ?? "someone no longer here"}`}
                  className="aspect-[4/5] w-full rounded-md object-cover"
                  loading="lazy"
                />
                <span className="block">
                  {photo.kind === "TRY_ON" ? "Try-on" : "Build photo"} · {photo.status}
                  {photo.coverPosition === null ? "" : " · cover"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <BuildHistory outfitId={outfitId} />

      <TextPromptModal
        open={pendingAction !== null}
        title={pendingCopy?.title ?? ""}
        label={pendingCopy?.label ?? ""}
        confirmLabel={pendingCopy?.button ?? ""}
        pendingLabel="Saving…"
        isPending={act.isPending}
        onConfirm={(reason) => {
          if (pendingAction) act.mutate({ action: pendingAction, reason });
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
};
