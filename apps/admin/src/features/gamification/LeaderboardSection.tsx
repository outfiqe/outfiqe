import { Checkbox, FormBanner } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { gamificationApi } from "./api";
import { LEADERBOARD_CATEGORY_LABEL } from "./badgeOptions.constants";

const LEADERBOARD_CATEGORIES_QUERY_KEY = ["admin-creator-leaderboard-categories"];

export const LeaderboardSection = () => {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: LEADERBOARD_CATEGORIES_QUERY_KEY,
    queryFn: gamificationApi.listCreatorLeaderboardCategories,
  });
  const [error, setError] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: ({ category, enabled }: { category: string; enabled: boolean }) =>
      gamificationApi.updateCreatorLeaderboardCategory(category, enabled),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: LEADERBOARD_CATEGORIES_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Creator leaderboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each ranking can be shown or hidden independently on the public leaderboard page — turning
        one off removes it from the page immediately, it doesn&apos;t stop the numbers behind it
        from being tracked.
      </p>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {categories?.map(({ category, enabled }) => (
          <label
            key={category}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <span className="text-sm font-medium text-foreground">
              {LEADERBOARD_CATEGORY_LABEL[category]}
            </span>
            <Checkbox
              checked={enabled}
              disabled={toggle.isPending}
              onChange={(e) => toggle.mutate({ category, enabled: e.target.checked })}
            />
          </label>
        ))}
      </div>
    </div>
  );
};
