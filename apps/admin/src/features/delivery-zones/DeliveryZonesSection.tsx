import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
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
  Skeleton,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ConfirmModal } from "@/components/ConfirmModal";
import { SkeletonButton } from "@/components/SkeletonControls";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { type DeliveryZoneInput, deliveryZonesApi, type UpdateDeliveryZoneInput } from "./api";
import { CityListInput } from "./CityListInput";
import {
  applyDefaultZoneInCache,
  removeZoneFromCache,
  upsertZoneInCache,
  ZONES_QUERY_KEY,
} from "./deliveryZonesCacheUpdate";
import { DELIVERY_ZONE_HISTORY_QUERY_KEY } from "./hooks/useDeliveryZoneHistory";
import type { DeliveryZone } from "./schemas";
import { EMPTY_ZONE_FORM, zoneFormSchema, type ZoneFormValues } from "./zoneForm.schema";

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

const toZoneInput = (values: ZoneFormValues): DeliveryZoneInput => ({
  name: values.name.trim(),
  cities: values.cities,
  standardDeliveryFee: Number(values.standardDeliveryFee),
  freeDeliveryThreshold: Number(values.freeDeliveryThreshold),
  codHandlingFee: Number(values.codHandlingFee),
});

const formValuesForZone = (zone: DeliveryZone): ZoneFormValues => ({
  name: zone.name,
  cities: zone.cities,
  standardDeliveryFee: String(zone.standardDeliveryFee),
  freeDeliveryThreshold: String(zone.freeDeliveryThreshold),
  codHandlingFee: String(zone.codHandlingFee),
});

type FeeFieldName = "standardDeliveryFee" | "freeDeliveryThreshold" | "codHandlingFee";

const ZoneFields = ({ form }: { form: UseFormReturn<ZoneFormValues> }) => {
  const feeField = (name: FeeFieldName, label: string, widthClass: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={`mt-0 ${widthClass} space-y-1.5`}>
          <FormLabel className={LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input inputMode="numeric" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="mt-0 w-64 space-y-1.5">
            <FormLabel className={LABEL_CLASS}>Zone name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="cities"
        render={({ field }) => (
          <FormItem className="mt-0 space-y-1.5">
            <FormLabel className={LABEL_CLASS}>Cities</FormLabel>
            <CityListInput cities={field.value} onChange={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex flex-wrap items-start gap-3">
        {feeField("standardDeliveryFee", "Standard delivery fee (Rs.)", "w-40")}
        {feeField("freeDeliveryThreshold", "Free delivery threshold (Rs.)", "w-44")}
        {feeField("codHandlingFee", "COD handling fee (Rs.)", "w-36")}
      </div>
    </div>
  );
};

const EditZoneModal = ({ zone, onClose }: { zone: DeliveryZone; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: formValuesForZone(zone),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateDeliveryZoneInput) => deliveryZonesApi.update(zone.id, input),
    invalidateKeys: [DELIVERY_ZONE_HISTORY_QUERY_KEY],
    successMessage: "Delivery zone saved.",
    onSuccess: (updatedZone) => {
      upsertZoneInCache(queryClient, updatedZone);
      onClose();
    },
  });

  const submitZone = form.handleSubmit((values) => update.mutate(toZoneInput(values)));

  return (
    <Modal open onClose={onClose} title="Edit delivery zone">
      <Form {...form}>
        <form onSubmit={submitZone} noValidate className="space-y-4">
          <ZoneFields form={form} />
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </Modal>
  );
};

const ZONE_CITY_CHIP_COUNT = 3;

const ZoneRowSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-5 w-96 max-w-full" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: ZONE_CITY_CHIP_COUNT }, (_unused, chipIndex) => (
            <Skeleton key={chipIndex} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <SkeletonButton size="sm" label="Set as default" />
        <SkeletonButton size="sm" label="Edit" />
        <SkeletonButton size="sm" variant="ghost" label="Delete" />
      </div>
    </div>
  </div>
);

export const DeliveryZonesSection = () => {
  const queryClient = useQueryClient();
  const { canUse } = usePlatformPermissions();
  const canManageZones = canUse(PLATFORM_MANAGE_PERMISSION.ORDERS);
  const {
    data: zones,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ZONES_QUERY_KEY,
    queryFn: deliveryZonesApi.list,
  });

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: EMPTY_ZONE_FORM,
    mode: "onTouched",
  });
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null);

  const create = useApiMutation({
    mutationFn: (values: ZoneFormValues) => deliveryZonesApi.create(toZoneInput(values)),
    successMessage: "Delivery zone added.",
    onSuccess: (createdZone) => {
      form.reset(EMPTY_ZONE_FORM);
      upsertZoneInCache(queryClient, createdZone);
    },
  });

  const setDefault = useApiMutation({
    mutationFn: (id: string) => deliveryZonesApi.setDefault(id),
    invalidateKeys: [DELIVERY_ZONE_HISTORY_QUERY_KEY],
    successMessage: "Default zone changed.",
    onSuccess: (updatedZone) => applyDefaultZoneInCache(queryClient, updatedZone),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const remove = useApiMutation({
    mutationFn: (id: string) => deliveryZonesApi.remove(id),
    successMessage: "Delivery zone deleted.",
    onSuccess: (_data, zoneId) => {
      removeZoneFromCache(queryClient, zoneId);
      setDeleteTarget(null);
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const submitZone = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Delivery zones</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Delivery and cash-on-delivery fees, matched by city. An order from a city that doesn&apos;t
        match any zone uses the default zone&apos;s rates.
      </p>

      {canManageZones && (
        <Form {...form}>
          <form
            onSubmit={submitZone}
            noValidate
            className="mt-4 rounded-xl border border-border bg-card p-4"
          >
            <ZoneFields form={form} />
            <Button type="submit" isLoading={create.isPending} className="mt-3">
              Add zone
            </Button>
          </form>
        </Form>
      )}

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading && Array.from({ length: 3 }).map((_, index) => <ZoneRowSkeleton key={index} />)}

        {isError && (
          <FormBanner className="flex items-center justify-between gap-3">
            <span>Couldn&apos;t load delivery zones.</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </FormBanner>
        )}

        {!isLoading && !isError && zones?.length === 0 && (
          <p className="text-sm text-muted-foreground">No zones yet.</p>
        )}

        {zones?.map((zone) => (
          <div key={zone.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{zone.name}</p>
                  {zone.isDefault && <Badge tone="positive">Default</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rs. {zone.standardDeliveryFee.toLocaleString()} delivery · free over Rs.{" "}
                  {zone.freeDeliveryThreshold.toLocaleString()} · Rs.{" "}
                  {zone.codHandlingFee.toLocaleString()} COD fee
                </p>
                {zone.cities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {zone.cities.map((city) => (
                      <span
                        key={city}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {canManageZones && (
                <div className="flex shrink-0 gap-2">
                  {!zone.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefault.mutate(zone.id)}
                      disabled={setDefault.isPending}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setEditingZone(zone)}>
                    Edit
                  </Button>
                  {!zone.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(zone)}
                      disabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingZone && (
        <EditZoneModal
          key={editingZone.id}
          zone={editingZone}
          onClose={() => setEditingZone(null)}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete delivery zone"
        description={deleteTarget ? `Delete the "${deleteTarget.name}" zone?` : undefined}
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
