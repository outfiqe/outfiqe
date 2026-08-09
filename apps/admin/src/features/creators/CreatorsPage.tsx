import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { creatorsApi } from "./api";
import type { CreatorStatusValue } from "./schemas";

const TABS: CreatorStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];

export function CreatorsPage() {
  const [tab, setTab] = useState<CreatorStatusValue>("PENDING");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["creators", tab],
    queryFn: () => creatorsApi.list(tab),
  });

  const approve = useMutation({
    mutationFn: (userId: string) => creatorsApi.approve(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creators"] }),
  });

  const reject = useMutation({
    mutationFn: (userId: string) => creatorsApi.reject(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creators"] }),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Creators</h1>

      <div className="mt-5 flex gap-2">
        {TABS.map((status) => (
          <button
            key={status}
            onClick={() => setTab(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === status
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {status[0]}
            {status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load creators.</p>}
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {data?.map((creator) => (
          <div
            key={creator.userId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <h2 className="font-display text-base font-bold text-foreground">{creator.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{creator.email}</p>
            </div>

            {creator.creatorStatus === "PENDING" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => approve.mutate(creator.userId)}
                  disabled={approve.isPending || reject.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => reject.mutate(creator.userId)}
                  disabled={approve.isPending || reject.isPending}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
