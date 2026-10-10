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
  MultiSelect,
  OUTFIT_SLOT_ICON_LABELS,
  OutfitSlotIcon,
  Select,
  Switch,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { OUTFIT_SLOT_ICONS } from "@outfiqe/utils";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";
import { slugify } from "@/lib/slugify";

import { outfitSlotTypesApi } from "../api/outfitSlotTypesApi";
import type { OutfitSlotType } from "../api/outfitSlotTypesSchemas";
import { OUTFIT_SLOT_TYPES_QUERY_KEY } from "../constants/outfitSlotTypes.constants";
import {
  EMPTY_SLOT_TYPE_FORM,
  slotTypeFormSchema,
  type SlotTypeFormValues,
  toSlotTypeFormValues,
} from "../schemas/slotTypeForm.schema";

type GarmentTypeOption = { id: string; label: string };

type SlotTypeFormModalProps = {
  slotType: OutfitSlotType | null;
  garmentTypes: GarmentTypeOption[];
  otherSlotTypes: OutfitSlotType[];
  onClose: () => void;
};

export const SlotTypeFormModal = ({
  slotType,
  garmentTypes,
  otherSlotTypes,
  onClose,
}: SlotTypeFormModalProps) => {
  const isEditing = slotType !== null;
  const form = useForm<SlotTypeFormValues>({
    resolver: zodResolver(slotTypeFormSchema),
    defaultValues: slotType ? toSlotTypeFormValues(slotType) : EMPTY_SLOT_TYPE_FORM,
    mode: "onTouched",
  });
  const [isKeyTouched, setIsKeyTouched] = useState(isEditing);
  const [acceptsAnyProductType, selectedIcon] = useWatch({
    control: form.control,
    name: ["acceptsAnyProductType", "icon"],
  });

  const saveSlotType = useApiMutation({
    mutationFn: ({ key, productTypeIds, ...otherChanges }: SlotTypeFormValues) => {
      const changes = {
        ...otherChanges,
        productTypeIds: otherChanges.acceptsAnyProductType ? [] : productTypeIds,
      };
      return slotType
        ? outfitSlotTypesApi.update(slotType.id, changes)
        : outfitSlotTypesApi.create({ key, ...changes });
    },
    invalidateKeys: [OUTFIT_SLOT_TYPES_QUERY_KEY],
    successMessage: isEditing ? "Slot type saved." : "Slot type created.",
    onSuccess: onClose,
  });

  const submitSlotType = form.handleSubmit((values) => saveSlotType.mutate(values));

  const garmentTypeOptions = garmentTypes.map(({ id, label }) => ({ value: id, label }));
  const blockableSlotOptions = otherSlotTypes.map(({ id, label }) => ({ value: id, label }));

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? `Edit ${slotType.label}` : "New slot type"}
      description="Changes only reach builds started from now on. Builds already in progress keep the slots they were started with."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="slot-type-form" isLoading={saveSlotType.isPending}>
            {isEditing ? "Save slot type" : "Create slot type"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="slot-type-form" onSubmit={submitSlotType} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Footwear"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        if (!isKeyTouched) {
                          form.setValue("key", slugify(event.target.value), {
                            shouldValidate: form.formState.touchedFields.key === true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="footwear"
                      {...field}
                      disabled={isEditing}
                      onChange={(event) => {
                        field.onChange(slugify(event.target.value));
                        setIsKeyTouched(true);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel>Icon</FormLabel>
                  <div className="flex items-center gap-2">
                    <OutfitSlotIcon icon={selectedIcon} className="text-muted-foreground" />
                    <FormControl>
                      <Select {...field}>
                        {OUTFIT_SLOT_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {OUTFIT_SLOT_ICON_LABELS[icon]}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxItems"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel>Items this slot holds</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      {...field}
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="acceptsAnyProductType"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem className="mt-0 flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <FormLabel>Takes any garment type</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Use this for a catch-all slot like Extra.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    {...field}
                    checked={value}
                    onChange={(event) => onChange(event.target.checked)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!acceptsAnyProductType && (
            <FormField
              control={form.control}
              name="productTypeIds"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel>Garment types that fill this slot</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={garmentTypeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add a garment type…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="blocksSlotTypeIds"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel>Can&apos;t be filled at the same time as</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={blockableSlotOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="No other slot"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Works both ways: Full Outfit blocking Top also means a filled Top blocks Full
                  Outfit.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {saveSlotType.isError && <FormBanner>{getErrorMessage(saveSlotType.error)}</FormBanner>}
        </form>
      </Form>
    </Modal>
  );
};
