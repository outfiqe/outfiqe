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
  Modal,
  Select,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { buildDealFormSchema, type DealFormValues, dealValueFrom } from "./dealForm.schema";
import { PartnerSearchField, type SelectedPartner } from "./PartnerSearchField";
import { crmPipelineApi } from "./pipelineApi";
import type { Deal, PipelineStage } from "./pipelineSchemas";

const DEALS_QUERY_KEY = ["crm-deals"];
const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

type DealFormModalProps = {
  open: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  deal: Deal | null;
};

export const DealFormModal = ({ open, onClose, stages, deal }: DealFormModalProps) => {
  const isEditing = deal !== null;
  const [partner, setPartner] = useState<SelectedPartner | null>(null);

  const form = useForm<DealFormValues>({
    resolver: zodResolver(buildDealFormSchema(isEditing)),
    defaultValues: {
      title: deal?.title ?? "",
      stageId: deal?.stageId ?? stages[0]?.id ?? "",
      value: String(deal?.value ?? 0),
      partnerCreatorId: "",
    },
    mode: "onTouched",
  });

  const save = useApiMutation({
    mutationFn: (values: DealFormValues) =>
      isEditing
        ? crmPipelineApi.updateDeal(deal.id, {
            title: values.title,
            stageId: values.stageId,
            value: dealValueFrom(values.value),
          })
        : crmPipelineApi.createDeal({
            title: values.title,
            stageId: values.stageId,
            value: dealValueFrom(values.value),
            partnerCreatorId: values.partnerCreatorId,
          }),
    invalidateKeys: [DEALS_QUERY_KEY],
    successMessage: isEditing ? "Deal saved." : "Deal created.",
    onSuccess: () => onClose(),
  });

  const submitDeal = form.handleSubmit((values) => save.mutate(values));

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit deal" : "New deal"}>
      <Form {...form}>
        <form onSubmit={submitDeal} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stageId"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Stage</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
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
            name="value"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Value (Rs.)</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
            <FormField
              control={form.control}
              name="partnerCreatorId"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel htmlFor="deal-partner" className={LABEL_CLASS}>
                    Partner
                  </FormLabel>
                  <PartnerSearchField
                    id="deal-partner"
                    value={partner}
                    onChange={(selected) => {
                      setPartner(selected);
                      field.onChange(selected?.creatorId ?? "");
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              {isEditing ? "Save deal" : "Create deal"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
