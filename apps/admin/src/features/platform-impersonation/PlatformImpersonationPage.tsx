import { Button, FormBanner, Input, Select, Skeleton, toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "../platform-metrics/api";
import { platformImpersonationApi } from "./api";
import type { ImpersonationScope, ImpersonationSession, StartImpersonationResult } from "./schemas";

const ACTIVE_SESSIONS_QUERY_KEY = ["platform-impersonation-active"];
const HISTORY_QUERY_KEY = ["platform-impersonation-history"];
const MIN_REASON_LENGTH = 3;

const formatMoment = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");

const SessionTable = ({
  sessions,
  onRevoke,
  revokingId,
}: {
  sessions: ImpersonationSession[];
  onRevoke?: (sessionId: string) => void;
  revokingId?: string;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="text-xs uppercase text-muted-foreground">
        <tr>
          <th className="py-2 pr-4">Tenant</th>
          <th className="py-2 pr-4">Acting as</th>
          <th className="py-2 pr-4">Staff</th>
          <th className="py-2 pr-4">Scope</th>
          <th className="py-2 pr-4">Started</th>
          <th className="py-2 pr-4">Expires</th>
          <th className="py-2 pr-4">State</th>
          {onRevoke && <th className="py-2">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => (
          <tr key={session.id} className="border-t border-border">
            <td className="py-2 pr-4">{session.organizationName ?? session.organizationId}</td>
            <td className="py-2 pr-4">{session.targetUserName ?? session.targetUserId}</td>
            <td className="py-2 pr-4">{session.impersonatorName ?? session.impersonatorId}</td>
            <td className="py-2 pr-4">{session.scope}</td>
            <td className="py-2 pr-4">{formatMoment(session.createdAt)}</td>
            <td className="py-2 pr-4">{formatMoment(session.expiresAt)}</td>
            <td className="py-2 pr-4">
              {session.active ? "Active" : session.revokedAt ? "Revoked" : "Expired"}
            </td>
            {onRevoke && (
              <td className="py-2">
                {session.active && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={revokingId === session.id}
                    onClick={() => onRevoke(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const PlatformImpersonationPage = () => {
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<ImpersonationScope>("read");
  const [ttlMinutes, setTtlMinutes] = useState("");
  const [lastResult, setLastResult] = useState<StartImpersonationResult | null>(null);
  const [tokenRevealed, setTokenRevealed] = useState(false);

  const tenants = useQuery({
    queryKey: ["platform-impersonation-tenants"],
    queryFn: () => platformMetricsApi.listTenants({ pageSize: 100, sort: "name" }),
  });

  const candidates = useQuery({
    queryKey: ["platform-impersonation-candidates", organizationId],
    queryFn: () => platformImpersonationApi.listCandidates(organizationId),
    enabled: organizationId !== "",
  });

  const activeSessions = useQuery({
    queryKey: ACTIVE_SESSIONS_QUERY_KEY,
    queryFn: platformImpersonationApi.listActive,
  });

  const history = useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: () => platformImpersonationApi.listHistory(),
  });

  const refreshSessions = () => {
    queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
  };

  const startSession = useMutation({
    mutationFn: () =>
      platformImpersonationApi.start({
        organizationId,
        targetUserId,
        reason: reason.trim(),
        scope,
        ttlMinutes: ttlMinutes ? Number(ttlMinutes) : undefined,
      }),
    onSuccess: (result) => {
      setLastResult(result);
      setTokenRevealed(false);
      setReason("");
      refreshSessions();
      toast.success("Impersonation session started.");
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const revokeSession = useMutation({
    mutationFn: (sessionId: string) => platformImpersonationApi.revoke(sessionId),
    onSuccess: () => {
      refreshSessions();
      toast.success("Session revoked.");
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const canSubmit = useMemo(
    () =>
      organizationId !== "" &&
      targetUserId !== "" &&
      reason.trim().length >= MIN_REASON_LENGTH &&
      !startSession.isPending,
    [organizationId, targetUserId, reason, startSession.isPending],
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Impersonation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start a time-boxed, audited support session that acts as a specific tenant member. Every
        session is logged, visible to the tenant, and expires on its own.
      </p>

      <section className="mt-6 max-w-xl space-y-4">
        <div>
          <label htmlFor="impersonation-tenant" className="text-xs text-muted-foreground">
            Tenant
          </label>
          <Select
            id="impersonation-tenant"
            value={organizationId}
            className="mt-1"
            onChange={(event) => {
              setOrganizationId(event.target.value);
              setTargetUserId("");
            }}
          >
            <option value="">Select a tenant…</option>
            {(tenants.data?.items ?? [])
              .filter((tenant) => !tenant.isPlatformOrg)
              .map((tenant) => (
                <option key={tenant.organizationId} value={tenant.organizationId}>
                  {tenant.name} ({tenant.plan})
                </option>
              ))}
          </Select>
        </div>

        <div>
          <label htmlFor="impersonation-target" className="text-xs text-muted-foreground">
            Act as
          </label>
          <Select
            id="impersonation-target"
            value={targetUserId}
            className="mt-1"
            disabled={organizationId === "" || candidates.isLoading}
            onChange={(event) => setTargetUserId(event.target.value)}
          >
            <option value="">
              {organizationId === "" ? "Pick a tenant first" : "Select a member…"}
            </option>
            {(candidates.data ?? []).map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {candidate.name} · {candidate.roleName} ({candidate.email})
              </option>
            ))}
          </Select>
          {candidates.error && (
            <p className="mt-1 text-xs text-destructive">{getErrorMessage(candidates.error)}</p>
          )}
        </div>

        <div>
          <label htmlFor="impersonation-reason" className="text-xs text-muted-foreground">
            Reason (shown in the audit trail)
          </label>
          <Input
            id="impersonation-reason"
            value={reason}
            className="mt-1"
            placeholder="e.g. Investigating a reported billing discrepancy"
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="impersonation-scope" className="text-xs text-muted-foreground">
              Scope
            </label>
            <Select
              id="impersonation-scope"
              value={scope}
              className="mt-1"
              onChange={(event) => setScope(event.target.value === "write" ? "write" : "read")}
            >
              <option value="read">Read-only</option>
              <option value="write">Read &amp; write</option>
            </Select>
          </div>
          <div className="w-32">
            <label htmlFor="impersonation-ttl" className="text-xs text-muted-foreground">
              Minutes (optional)
            </label>
            <Input
              id="impersonation-ttl"
              type="number"
              min={1}
              max={60}
              value={ttlMinutes}
              className="mt-1"
              placeholder="30"
              onChange={(event) => setTtlMinutes(event.target.value)}
            />
          </div>
        </div>

        {startSession.isError && <FormBanner>{getErrorMessage(startSession.error)}</FormBanner>}

        <Button disabled={!canSubmit} onClick={() => startSession.mutate()}>
          Start session
        </Button>
      </section>

      {lastResult && (
        <section className="mt-6 max-w-xl rounded-lg border border-border bg-muted p-4">
          <p className="text-sm text-foreground">
            Session active until <strong>{formatMoment(lastResult.expiresAt)}</strong>, acting as{" "}
            {lastResult.session.targetUserName ?? lastResult.session.targetUserId}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The access token below is short-lived, {lastResult.session.scope}-scoped, and every
            request made with it is audited. Use it only with trusted support tooling.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTokenRevealed((revealed) => !revealed)}
            >
              {tokenRevealed ? "Hide access token" : "Reveal access token"}
            </Button>
            {tokenRevealed && (
              <Input
                readOnly
                value={lastResult.token}
                className="mt-2 font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
            )}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-foreground">Active sessions</h2>
        <div className="mt-3">
          {activeSessions.isLoading && <Skeleton className="h-24 w-full" />}
          {activeSessions.error && <FormBanner>{getErrorMessage(activeSessions.error)}</FormBanner>}
          {activeSessions.data && activeSessions.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No active impersonation sessions.</p>
          )}
          {activeSessions.data && activeSessions.data.length > 0 && (
            <SessionTable
              sessions={activeSessions.data}
              onRevoke={(sessionId) => revokeSession.mutate(sessionId)}
              revokingId={revokeSession.isPending ? revokeSession.variables : undefined}
            />
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-foreground">Recent history</h2>
        <div className="mt-3">
          {history.isLoading && <Skeleton className="h-24 w-full" />}
          {history.error && <FormBanner>{getErrorMessage(history.error)}</FormBanner>}
          {history.data && history.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          )}
          {history.data && history.data.length > 0 && <SessionTable sessions={history.data} />}
        </div>
      </section>
    </div>
  );
};
