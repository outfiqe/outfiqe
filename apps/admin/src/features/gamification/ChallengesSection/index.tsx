import { Button } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { gamificationApi } from "../api";
import type { ChallengeAdmin } from "../schemas";
import { ChallengeCard } from "./ChallengeCard";
import { CHALLENGES_QUERY_KEY, createEmptyChallengeForm } from "./challengeForm.constants";
import type { ChallengeFormState } from "./challengeForm.types";
import { CreateChallengeModal } from "./CreateChallengeModal";
import { EditChallengeModal } from "./EditChallengeModal";

export const ChallengesSection = () => {
  const { data: challenges, isLoading } = useQuery({
    queryKey: CHALLENGES_QUERY_KEY,
    queryFn: gamificationApi.listChallengesAdmin,
  });

  const [editingChallenge, setEditingChallenge] = useState<ChallengeAdmin | null>(null);
  const [createForm, setCreateForm] = useState<ChallengeFormState | null>(null);

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateForm(createEmptyChallengeForm())}
        >
          New challenge
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {challenges?.length === 0 && (
          <p className="text-sm text-muted-foreground">No challenges yet.</p>
        )}

        {challenges?.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} onEdit={setEditingChallenge} />
        ))}
      </div>

      {createForm && (
        <CreateChallengeModal initialForm={createForm} onClose={() => setCreateForm(null)} />
      )}

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
