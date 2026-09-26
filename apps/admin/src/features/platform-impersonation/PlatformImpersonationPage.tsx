import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TableSkeleton } from "@/components/TableSkeleton";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { buildImpersonationHandoffUrl } from "@/lib/impersonationHandoff";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { platformMetricsApi } from "../platform-metrics/api";
import { platformImpersonationApi } from "./api";
import {
  EMPTY_IMPERSONATION_FORM,
  impersonationFormSchema,
  type ImpersonationFormValues,
} from "./impersonationForm.schema";
import type { ImpersonationSession, StartImpersonationResult } from "./schemas";

const ACTIVE_SESSIONS_QUERY_KEY = ["platform-impersonation-active"];
const HISTORY_QUERY_KEY = ["platform-impersonation-history"];

const formatMoment = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");

const SessionTable = ({
  sessions,
  onRevoke,
  revokingId,
  onOpen,
  openingId,
  canRevoke,
}: {
  sessions: ImpersonationSession[];
  canRevoke?: (session: ImpersonationSession) => boolean;
  onRevoke?: (sessionId: string) => void;
  revokingId?: string;
  onOpen?: (sessionId: string) => void;
  openingId?: string;
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
              {session.active ? "Active" : session.revokedById ? "Revoked" : "Expired"}
            </td>
            {onRevoke && (
              <td className="py-2">
                {session.active && (
                  <div className="flex gap-2">
                    {onOpen && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={openingId === session.id}
                        onClick={() => onOpen(session.id)}
                      >
                        Open
                      </Button>
                    )}
                    {canRevoke?.(session) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revokingId === session.id}
                        onClick={() => onRevoke(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SESSION_TABLE_HEADERS = [
  "Tenant",
  "Acting as",
  "Staff",
  "Scope",
  "Started",
  "Expires",
  "State",
];
const ACTIVE_SESSION_TABLE_HEADERS = [...SESSION_TABLE_HEADERS, "Actions"];
const ACTIVE_SESSION_ACTION_COLUMN = { header: "Actions", label: "Revoke" };
const ACTIVE_SESSION_SKELETON_ROW_COUNT = 3;

export const PlatformImpersonationPage = () => {
  const { canUse, viewerUserId } = usePlatformPermissions();
  const canRevokeAnySession = canUse(PLATFORM_MANAGE_PERMISSION.IMPERSONATION_SESSIONS);
  const canRevokeSession = (session: ImpersonationSession) =>
    canRevokeAnySession || session.impersonatorId === viewerUserId;
  const form = useForm<ImpersonationFormValues>({
    resolver: zodResolver(impersonationFormSchema),
    defaultValues: EMPTY_IMPERSONATION_FORM,
    mode: "onTouched",
  });
  const organizationId = form.watch("organizationId");
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

  const IMPERSONATION_INVALIDATE_KEYS = [ACTIVE_SESSIONS_QUERY_KEY, HISTORY_QUERY_KEY];

  const startSession = useApiMutation({
    mutationFn: (values: ImpersonationFormValues) =>
      platformImpersonationApi.start({
        organizationId: values.organizationId,
        targetUserId: values.targetUserId,
        reason: values.reason,
        scope: values.scope,
        ttlMinutes: values.ttlMinutes ? Number(values.ttlMinutes) : undefined,
      }),
    invalidateKeys: IMPERSONATION_INVALIDATE_KEYS,
    successMessage: "Impersonation session started.",
    onSuccess: (result) => {
      setLastResult(result);
      setTokenRevealed(false);
      form.resetField("reason");
    },
  });

  const submitImpersonation = form.handleSubmit((values) => startSession.mutate(values));

  const revokeSession = useApiMutation({
    mutationFn: (sessionId: string) => platformImpersonationApi.revoke(sessionId),
    invalidateKeys: IMPERSONATION_INVALIDATE_KEYS,
    onSuccess: () => toast.success("Session revoked."),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const openSession = useApiMutation({
    mutationFn: (sessionId: string) => platformImpersonationApi.open(sessionId),
    onSuccess: (result) => {
      const handoffUrl = buildImpersonationHandoffUrl(result.tenantSubdomain, result.code);
      window.open(handoffUrl, "_blank", "noopener");
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Impersonation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start a time-boxed, audited support session that acts as a specific tenant member. Every
        session is logged, visible to the tenant, and expires on its own.
      </p>

      <Form {...form}>
        <form onSubmit={submitImpersonation} noValidate className="mt-6 max-w-xl space-y-4">
          <FormField
            control={form.control}
            name="organizationId"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1">
                <FormLabel className="text-xs font-normal text-muted-foreground">Tenant</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      form.setValue("targetUserId", "");
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targetUserId"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1">
                <FormLabel className="text-xs font-normal text-muted-foreground">Act as</FormLabel>
                <FormControl>
                  <Select {...field} disabled={organizationId === "" || candidates.isLoading}>
                    <option value="">
                      {organizationId === "" ? "Pick a tenant first" : "Select a member…"}
                    </option>
                    {(candidates.data ?? []).map((candidate) => (
                      <option key={candidate.userId} value={candidate.userId}>
                        {candidate.name} · {candidate.roleName} ({candidate.email})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                {candidates.error && (
                  <p className="mt-1 text-xs text-destructive">
                    {getErrorMessage(candidates.error)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Reason (shown in the audit trail)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Investigating a reported billing discrepancy"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-start gap-4">
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem className="mt-0 flex-1 space-y-1">
                  <FormLabel className="text-xs font-normal text-muted-foreground">Scope</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="read">Read-only</option>
                      <option value="write">Read &amp; write</option>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ttlMinutes"
              render={({ field }) => (
                <FormItem className="mt-0 w-32 space-y-1">
                  <FormLabel className="text-xs font-normal text-muted-foreground">
                    Minutes (optional)
                  </FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {startSession.isError && <FormBanner>{getErrorMessage(startSession.error)}</FormBanner>}

          <Button type="submit" isLoading={startSession.isPending}>
            Start session
          </Button>
        </form>
      </Form>

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
          {activeSessions.isLoading && (
            <TableSkeleton
              headers={ACTIVE_SESSION_TABLE_HEADERS}
              rowCount={ACTIVE_SESSION_SKELETON_ROW_COUNT}
              actionColumn={ACTIVE_SESSION_ACTION_COLUMN}
            />
          )}
          {activeSessions.error && <FormBanner>{getErrorMessage(activeSessions.error)}</FormBanner>}
          {activeSessions.data && activeSessions.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No active impersonation sessions.</p>
          )}
          {activeSessions.data && activeSessions.data.length > 0 && (
            <SessionTable
              sessions={activeSessions.data}
              canRevoke={canRevokeSession}
              onRevoke={(sessionId) => revokeSession.mutate(sessionId)}
              revokingId={revokeSession.isPending ? revokeSession.variables : undefined}
              onOpen={(sessionId) => openSession.mutate(sessionId)}
              openingId={openSession.isPending ? openSession.variables : undefined}
            />
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-foreground">Recent history</h2>
        <div className="mt-3">
          {history.isLoading && <TableSkeleton headers={SESSION_TABLE_HEADERS} />}
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
