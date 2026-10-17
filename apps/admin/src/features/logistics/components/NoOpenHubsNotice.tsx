import { Link } from "@tanstack/react-router";

export const NoOpenHubsNotice = () => (
  <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
    No open hubs yet.{" "}
    <Link to="/logistics/hubs" className="cursor-pointer underline">
      Add a hub
    </Link>{" "}
    first.
  </p>
);
