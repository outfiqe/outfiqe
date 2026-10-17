import { Button, Input, Label } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";

import { bagTagsApi } from "../api/bagTagsApi";
import { BAG_TAG_BATCHES_QUERY_KEY } from "../constants/bagTagQueryKeys";

const DEFAULT_TAG_COUNT = 40;
const MIN_TAG_COUNT = 1;
const MAX_TAG_COUNT = 500;

type CreateBagTagBatchFormProps = { hubId: string };

export const CreateBagTagBatchForm = ({ hubId }: CreateBagTagBatchFormProps) => {
  const navigate = useNavigate();
  const tagCountInputId = useId();
  const [tagCount, setTagCount] = useState(String(DEFAULT_TAG_COUNT));
  const parsedTagCount = Number(tagCount);
  const isValidTagCount =
    Number.isInteger(parsedTagCount) &&
    parsedTagCount >= MIN_TAG_COUNT &&
    parsedTagCount <= MAX_TAG_COUNT;

  const createBatch = useApiMutation({
    mutationFn: () => bagTagsApi.create(hubId, parsedTagCount),
    invalidateKeys: [BAG_TAG_BATCHES_QUERY_KEY],
    successMessage: "Stickers made. Print them now.",
    onSuccess: (batch) =>
      void navigate({ to: "/logistics/bag-tags/$batchId", params: { batchId: batch.id } }),
  });

  const submitBatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isValidTagCount) createBatch.mutate();
  };

  return (
    <form
      onSubmit={submitBatch}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="w-40">
        <Label htmlFor={tagCountInputId}>How many stickers</Label>
        <Input
          id={tagCountInputId}
          type="number"
          inputMode="numeric"
          min={MIN_TAG_COUNT}
          max={MAX_TAG_COUNT}
          value={tagCount}
          onChange={(event) => setTagCount(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={!isValidTagCount} isLoading={createBatch.isPending}>
        Make stickers
      </Button>
    </form>
  );
};
