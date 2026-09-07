import { Badge, Button, FormBanner, Input, Modal, Skeleton, toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/errorMessages";

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

type ZoneFormState = {
  name: string;
  cities: string[];
  standardDeliveryFee: string;
  freeDeliveryThreshold: string;
  codHandlingFee: string;
};

const EMPTY_FORM: ZoneFormState = {
  name: "",
  cities: [],
  standardDeliveryFee: "",
  freeDeliveryThreshold: "",
  codHandlingFee: "",
};

const toZoneInput = (form: ZoneFormState): DeliveryZoneInput => ({
  name: form.name,
  cities: form.cities,
  standardDeliveryFee: Number(form.standardDeliveryFee),
  freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
  codHandlingFee: Number(form.codHandlingFee),
});

const formForZone = (zone: DeliveryZone): ZoneFormState => ({
  name: zone.name,
  cities: zone.cities,
  standardDeliveryFee: String(zone.standardDeliveryFee),
  freeDeliveryThreshold: String(zone.freeDeliveryThreshold),
  codHandlingFee: String(zone.codHandlingFee),
});

const ZoneFields = ({
  form,
  onChange,
}: {
  form: ZoneFormState;
  onChange: (form: ZoneFormState) => void;
}) => (
  <div className="space-y-3">
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Zone name</label>
      <Input
        required
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        className="w-64"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Cities</label>
      <CityListInput cities={form.cities} onChange={(cities) => onChange({ ...form, cities })} />
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Standard delivery fee (Rs.)</label>
        <Input
          type="number"
          required
          min={0}
          value={form.standardDeliveryFee}
          onChange={(e) => onChange({ ...form, standardDeliveryFee: e.target.value })}
          className="w-40"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Free delivery threshold (Rs.)</label>
        <Input
          type="number"
          required
          min={0}
          value={form.freeDeliveryThreshold}
          onChange={(e) => onChange({ ...form, freeDeliveryThreshold: e.target.value })}
          className="w-44"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">COD handling fee (Rs.)</label>
        <Input
          type="number"
          required
          min={0}
          value={form.codHandlingFee}
          onChange={(e) => onChange({ ...form, codHandlingFee: e.target.value })}
          className="w-36"
        />
      </div>
    </div>
  </div>
);

const EditZoneModal = ({ zone, onClose }: { zone: DeliveryZone; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ZoneFormState>(() => formForZone(zone));
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateDeliveryZoneInput) => deliveryZonesApi.update(zone.id, input),
    onSuccess: (updatedZone) => {
      upsertZoneInCache(queryClient, updatedZone);
      queryClient.invalidateQueries({ queryKey: DELIVERY_ZONE_HISTORY_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(toZoneInput(form));
  };

  return (
    <Modal open onClose={onClose} title="Edit delivery zone">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ZoneFields form={form} onChange={setForm} />
        {error && <FormBanner>{error}</FormBanner>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
};

export const DeliveryZonesSection = () => {
  const queryClient = useQueryClient();
  const {
    data: zones,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ZONES_QUERY_KEY,
    queryFn: deliveryZonesApi.list,
  });

  const [form, setForm] = useState<ZoneFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null);

  const create = useMutation({
    mutationFn: () => deliveryZonesApi.create(toZoneInput(form)),
    onSuccess: (createdZone) => {
      setForm(EMPTY_FORM);
      setError(null);
      upsertZoneInCache(queryClient, createdZone);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => deliveryZonesApi.setDefault(id),
    onSuccess: (updatedZone) => {
      applyDefaultZoneInCache(queryClient, updatedZone);
      queryClient.invalidateQueries({ queryKey: DELIVERY_ZONE_HISTORY_QUERY_KEY });
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deliveryZonesApi.remove(id),
    onSuccess: (_data, zoneId) => {
      removeZoneFromCache(queryClient, zoneId);
      setDeleteTarget(null);
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Delivery zones</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Delivery and cash-on-delivery fees, matched by city. An order from a city that doesn&apos;t
        match any zone uses the default zone&apos;s rates.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-border bg-card p-4">
        <ZoneFields form={form} onChange={setForm} />
        <Button type="submit" disabled={create.isPending} className="mt-3">
          {create.isPending ? "Creating…" : "Add zone"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}

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
