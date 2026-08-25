import { Button, FormBanner } from "@outfiqe/design-system";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { crmApi } from "./api";

const routeApi = getRouteApi("/_authenticated/crm/invites/accept");

type AcceptState =
  { status: "loading" } | { status: "error"; message: string } | { status: "done" };

export const AcceptInvitePage = () => {
  const { token } = routeApi.useSearch();
  const [state, setState] = useState<AcceptState>(() =>
    token
      ? { status: "loading" }
      : { status: "error", message: "This invite link is missing a token." },
  );

  useEffect(() => {
    if (!token) return;

    crmApi
      .acceptInvite(token)
      .then(() => setState({ status: "done" }))
      .catch((err) =>
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "This invite link is not valid.",
        }),
      );
  }, [token]);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-bold text-foreground">CRM invite</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {state.status === "loading" && (
          <p className="text-sm text-muted-foreground">Accepting your invite…</p>
        )}

        {state.status === "error" && <FormBanner>{state.message}</FormBanner>}

        {state.status === "done" && (
          <>
            <p className="text-sm text-foreground">
              You now have CRM access. You can manage members and pipeline from here on out.
            </p>
            <Link to="/crm">
              <Button className="mt-4">Go to CRM</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
