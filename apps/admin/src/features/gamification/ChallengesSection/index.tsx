import { Button, FormBanner } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { gamificationApi } from "../api";
import type { ChallengeAdmin } from "../schemas";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeFields } from "./ChallengeFields";
import { CHALLENGES_QUERY_KEY, createEmptyChallengeForm } from "./challengeForm.constants";
import type { ChallengeFormState } from "./challengeForm.types";
import { toChallengeFormInput } from "./challengeForm.utils";
import { EditChallengeModal } from "./EditChallengeModal";

export const ChallengesSection = () => {
  const queryClient = useQueryClient();
  const { data: challenges, isLoading } = useQuery({
    queryKey: CHALLENGES_QUERY_KEY,
    queryFn: gamificationApi.listChallengesAdmin,
  });

  const [form, setForm] = useState<ChallengeFormState>(createEmptyChallengeForm);
  const [error, setError] = useState<string | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeAdmin | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const create = useMutation({
    mutationFn: () => gamificationApi.createChallenge(toChallengeFormInput(form)),
    onSuccess: () => {
      setForm(createEmptyChallengeForm());
      setError(null);
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: CHALLENGES_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Challenges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Time-boxed goals users can complete for a badge and XP — separate from the general badge
            catalog.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCreateForm((open) => !open)}>
          {showCreateForm ? "Cancel" : "New challenge"}
        </Button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4"
        >
          <ChallengeFields idPrefix="create-challenge" form={form} onChange={setForm} />
          {error && <FormBanner>{error}</FormBanner>}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create challenge"}
          </Button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {challenges?.length === 0 && (
          <p className="text-sm text-muted-foreground">No challenges yet.</p>
        )}

        {challenges?.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} onEdit={setEditingChallenge} />
        ))}
      </div>

      {editingChallenge && (
        <EditChallengeModal
          key={editingChallenge.id}
          challenge={editingChallenge}
          onClose={() => setEditingChallenge(null)}
        />
      )}
    </div>
  );
};
