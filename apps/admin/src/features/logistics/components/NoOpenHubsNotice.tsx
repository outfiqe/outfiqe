import { Button, FormBanner } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

type NoOpenHubsNoticeProps = { hasHubsError: boolean; onRetry: () => void };

export const NoOpenHubsNotice = ({ hasHubsError, onRetry }: NoOpenHubsNoticeProps) =>
  hasHubsError ? (
    <div className="space-y-3">
      <FormBanner>We couldn&apos;t load the hubs.</FormBanner>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  ) : (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No open hubs yet.{" "}
      <Link to="/logistics/hubs" className="cursor-pointer underline">
        Add a hub
      </Link>{" "}
      first.
    </p>
  );
