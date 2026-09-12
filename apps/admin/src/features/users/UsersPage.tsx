import { Badge, Button, Input } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";

import { usersApi } from "./api";
import { BanAccountModal } from "./components/BanAccountModal";
import { SuspendAccountModal } from "./components/SuspendAccountModal";
import { useInfiniteUsers } from "./hooks/useInfiniteUsers";
import type { AccountStatusValue } from "./schemas";

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_TONE: Record<AccountStatusValue, "success" | "neutral" | "negative"> = {
  ACTIVE: "success",
  SUSPENDED: "neutral",
  BANNED: "negative",
};

const formatExpiry = (expiresAt: string | null): string =>
  expiresAt
    ? `until ${new Date(expiresAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`
    : "indefinitely";

const actionFailureMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiClientError ? error.message : fallback;

export const UsersPage = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: usersQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteUsers(debouncedQuery.trim());
  const users = usersQuery?.pages.flatMap((page) => page.items) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const suspend = useMutation({
    mutationFn: ({
      userId,
      reason,
      durationHours,
    }: {
      userId: string;
      reason: string;
      durationHours?: number;
    }) => usersApi.suspend(userId, reason, durationHours),
    onSuccess: () => {
      invalidate();
      setSuspendTargetId(null);
    },
  });

  const ban = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      usersApi.ban(userId, reason),
    onSuccess: () => {
      invalidate();
      setBanTargetId(null);
    },
  });

  const unsuspend = useMutation({
    mutationFn: (userId: string) => usersApi.unsuspend(userId),
    onSuccess: invalidate,
  });

  const unban = useMutation({
    mutationFn: (userId: string) => usersApi.unban(userId),
    onSuccess: invalidate,
  });

  const actionErrorFor = (userId: string): string | null => {
    if (suspend.isError && suspend.variables?.userId === userId) {
      return actionFailureMessage(suspend.error, "Couldn't suspend this account. Try again.");
    }
    if (ban.isError && ban.variables?.userId === userId) {
      return actionFailureMessage(ban.error, "Couldn't ban this account. Try again.");
    }
    if (unsuspend.isError && unsuspend.variables === userId) {
      return actionFailureMessage(unsuspend.error, "Couldn't unsuspend this account. Try again.");
    }
    if (unban.isError && unban.variables === userId) {
      return actionFailureMessage(unban.error, "Couldn't lift this ban. Try again.");
    }
    return null;
  };

  const suspendTarget = users.find((user) => user.id === suspendTargetId);
  const banTarget = users.find((user) => user.id === banTargetId);
  const anyActionPending =
    suspend.isPending || ban.isPending || unsuspend.isPending || unban.isPending;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Users</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Search for an account to suspend, ban, or restore it.
      </p>

      <Input
        className="mt-5 max-w-sm"
        placeholder="Search by name, username, or email…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-6 space-y-3">
        {!debouncedQuery.trim() && (
          <p className="text-sm text-muted-foreground">Start typing to find an account.</p>
        )}
        {debouncedQuery.trim() && isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load users.</p>}
        {debouncedQuery.trim() && !isLoading && users.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No accounts match &ldquo;{debouncedQuery.trim()}&rdquo;.
          </p>
        )}

        {users.map((user) => {
          const actionError = actionErrorFor(user.id);
          const isAdmin = user.role === "ADMIN";

          return (
            <div key={user.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-foreground">
                      {user.name}
                    </h2>
                    <Badge tone={STATUS_TONE[user.accountStatus]} showDot={false}>
                      {user.accountStatus[0]}
                      {user.accountStatus.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    @{user.handle} &middot; {user.email} &middot; {user.role.toLowerCase()}
                  </p>
                  {user.accountStatus !== "ACTIVE" && user.suspensionReason && (
                    <p className="mt-2 text-sm text-foreground">
                      {user.suspensionReason}
                      <span className="text-muted-foreground">
                        {" "}
                        — {user.accountStatus === "BANNED" ? "banned" : "suspended"}{" "}
                        {formatExpiry(user.suspensionExpiresAt)}
                      </span>
                    </p>
                  )}
                </div>

                {!isAdmin && (
                  <div className="flex gap-2">
                    {user.accountStatus === "ACTIVE" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setSuspendTargetId(user.id)}
                          disabled={anyActionPending}
                        >
                          Suspend
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setBanTargetId(user.id)}
                          disabled={anyActionPending}
                        >
                          Ban
                        </Button>
                      </>
                    )}
                    {user.accountStatus === "SUSPENDED" && (
                      <>
                        <Button
                          onClick={() => unsuspend.mutate(user.id)}
                          disabled={anyActionPending}
                        >
                          {unsuspend.isPending && unsuspend.variables === user.id
                            ? "Unsuspending…"
                            : "Unsuspend"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setBanTargetId(user.id)}
                          disabled={anyActionPending}
                        >
                          Ban
                        </Button>
                      </>
                    )}
                    {user.accountStatus === "BANNED" && (
                      <Button onClick={() => unban.mutate(user.id)} disabled={anyActionPending}>
                        {unban.isPending && unban.variables === user.id
                          ? "Lifting ban…"
                          : "Lift ban"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {actionError && <p className="mt-3 text-sm text-destructive">{actionError}</p>}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      <SuspendAccountModal
        open={suspendTargetId !== null}
        targetName={suspendTarget?.name ?? "this account"}
        isPending={suspend.isPending}
        onConfirm={({ reason, durationHours }) => {
          if (suspendTargetId) suspend.mutate({ userId: suspendTargetId, reason, durationHours });
        }}
        onCancel={() => setSuspendTargetId(null)}
      />

      <BanAccountModal
        open={banTargetId !== null}
        targetName={banTarget?.name ?? "this account"}
        isPending={ban.isPending}
        onConfirm={(reason) => {
          if (banTargetId) ban.mutate({ userId: banTargetId, reason });
        }}
        onCancel={() => setBanTargetId(null)}
      />
    </div>
  );
};
