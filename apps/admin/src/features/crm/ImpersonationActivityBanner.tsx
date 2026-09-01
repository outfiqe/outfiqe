import { Button, FormBanner, toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";

const END_SESSION_PERMISSION_KEY = "org:update";

export const ImpersonationActivityBanner = () => {
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
  });

  const activeImpersonation = organization?.activeImpersonation ?? null;

  const history = useQuery({
    queryKey: ["crm-impersonation-log"],
    queryFn: crmApi.listImpersonationLog,
    enabled: historyOpen,
  });

  const endSession = useMutation({
    mutationFn: crmApi.endImpersonation,
    onSuccess: async () => {
      toast.success("Support session ended.");
      await queryClient.invalidateQueries({ queryKey: ["crm-organization"] });
      await queryClient.invalidateQueries({ queryKey: ["crm-impersonation-log"] });
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  if (!organization || !activeImpersonation) return null;

  const canEndSession =
    organization.viewerIsSuperAdmin ||
    organization.viewerPermissionKeys.includes(END_SESSION_PERMISSION_KEY);
  const startedBy = activeImpersonation.byName ?? "An Outfiqe staff member";
  const startedAt = new Date(activeImpersonation.since).toLocaleString();

  return (
    <FormBanner tone="negative">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <strong>{startedBy}</strong> from Outfiqe support is currently accessing this workspace
          (started {startedAt}).
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setHistoryOpen((open) => !open)}>
            {historyOpen ? "Hide activity" : "View activity"}
          </Button>
          {canEndSession && (
            <Button
              size="sm"
              variant="outline"
              disabled={endSession.isPending}
              onClick={() => endSession.mutate()}
            >
              End session
            </Button>
          )}
        </div>
      </div>

      {historyOpen && (
        <div className="mt-3 border-t border-border/60 pt-3">
          {history.isLoading && <p className="text-xs text-muted-foreground">Loading activity…</p>}
          {history.error && (
            <p className="text-xs text-muted-foreground">{getErrorMessage(history.error)}</p>
          )}
          {history.data && history.data.length === 0 && (
            <p className="text-xs text-muted-foreground">No support sessions recorded yet.</p>
          )}
          {history.data && history.data.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {history.data.map((entry) => (
                <li key={entry.id}>
                  {new Date(entry.at).toLocaleString()} —{" "}
                  {entry.kind === "started" ? "Session started" : "Session ended"} by{" "}
                  {entry.staffName ?? "Outfiqe support"}
                  {entry.kind === "started" && entry.scope ? ` (${entry.scope}-only)` : ""}
                  {entry.kind === "started" && entry.reason ? ` — “${entry.reason}”` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </FormBanner>
  );
};
