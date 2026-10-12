import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Form, FormBanner, Modal } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { gamificationApi, type UpdateCreatorCompetitionFormInput } from "../../api/gamificationApi";
import type { CreatorCompetitionAdmin } from "../../api/gamificationSchemas";
import { COMPETITIONS_QUERY_KEY } from "../constants/competitions.constants";
import {
  competitionFormSchema,
  type CompetitionFormValues,
} from "../schemas/competitionForm.schema";
import { formForCompetition, toFormInput } from "../utils/competitionForm.utils";
import { CompetitionFields } from "./CompetitionFields";

export const EditCompetitionModal = ({
  competition,
  onClose,
}: {
  competition: CreatorCompetitionAdmin;
  onClose: () => void;
}) => {
  const [isActive, setIsActive] = useState(competition.isActive);
  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: formForCompetition(competition),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateCreatorCompetitionFormInput) =>
      gamificationApi.updateCreatorCompetition(competition.id, input),
    invalidateKeys: [COMPETITIONS_QUERY_KEY],
    successMessage: "Competition updated.",
    onSuccess: () => onClose(),
  });

  const submitCompetitionEdit = form.handleSubmit((values) =>
    update.mutate({ ...toFormInput(values), isActive }),
  );

  return (
    <Modal open onClose={onClose} title="Edit competition">
      <Form {...form}>
        <form onSubmit={submitCompetitionEdit} noValidate className="space-y-4">
          <CompetitionFields form={form} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              id={`edit-competition-${competition.id}-active`}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </Modal>
  );
};
