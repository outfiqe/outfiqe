import { Button, Checkbox, Input, Label, Select, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { deliveryZonesApi } from "@/features/delivery-zones/api/deliveryZonesApi";

import type { DeliveryPartner } from "../api/partnersSchemas";
import { MAX_ZONE_PRIORITY } from "../constants/partnerLabels";
import { useReplacePartnerZones } from "../hooks/useReplacePartnerZones";

const AREA_CHOICES_QUERY_KEY = ["logistics-partner-area-choices"] as const;
const FIRST_PRIORITY = 0;
const NO_HUB_ACCOUNTS = 0;

type AreaChoice = { isSelected: boolean; priority: number };

const toAreaChoices = (partner: DeliveryPartner, hubId: string) =>
  Object.fromEntries(
    partner.zones
      .filter((zone) => zone.hubId === hubId)
      .map(({ deliveryZoneId, priority }) => [deliveryZoneId, { isSelected: true, priority }]),
  );

type PartnerAreasSectionProps = { partner: DeliveryPartner; canManage: boolean };

export const PartnerAreasSection = ({ partner, canManage }: PartnerAreasSectionProps) => {
  const [firstAccount] = partner.accounts;
  const [hubId, setHubId] = useState(firstAccount?.hubId ?? "");
  const [areaChoices, setAreaChoices] = useState<Record<string, AreaChoice>>(() =>
    toAreaChoices(partner, hubId),
  );
  const replaceZones = useReplacePartnerZones(partner.id);
  const hubSelectId = useId();
  const { data: zones, isPending } = useQuery({
    queryKey: AREA_CHOICES_QUERY_KEY,
    queryFn: deliveryZonesApi.list,
  });
  const countryZones = zones?.filter((zone) => zone.countryCode === partner.countryCode) ?? [];

  const chooseHub = (nextHubId: string) => {
    setHubId(nextHubId);
    setAreaChoices(toAreaChoices(partner, nextHubId));
  };

  const updateAreaChoice = (zoneId: string, change: Partial<AreaChoice>) =>
    setAreaChoices((current) => {
      const existingChoice = current[zoneId] ?? { isSelected: false, priority: FIRST_PRIORITY };
      return { ...current, [zoneId]: { ...existingChoice, ...change } };
    });

  const saveAreas = () =>
    replaceZones.mutate({
      hubId,
      zones: Object.entries(areaChoices)
        .filter(([, { isSelected }]) => isSelected)
        .map(([deliveryZoneId, { priority }]) => ({ deliveryZoneId, priority, isActive: true })),
    });

  return (
    <section aria-labelledby="partner-areas-heading" className="space-y-3">
      <h2 id="partner-areas-heading" className="text-lg font-semibold text-foreground">
        Where they deliver
      </h2>
      {partner.accounts.length === NO_HUB_ACCOUNTS ? (
        <p className="text-sm text-muted-foreground">Add a hub account first.</p>
      ) : (
        <>
          <div className="max-w-xs">
            <Label htmlFor={hubSelectId}>From hub</Label>
            <Select
              id={hubSelectId}
              value={hubId}
              onChange={(event) => chooseHub(event.target.value)}
            >
              {partner.accounts.map((account) => (
                <option key={account.hubId} value={account.hubId}>
                  {account.hubName}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Tick the delivery zones they cover. Lower priority numbers are tried first.
          </p>
          {isPending && <Skeleton className="h-24 w-full rounded-lg" />}
          <ul className="space-y-2">
            {countryZones.map((zone) => {
              const choice = areaChoices[zone.id];
              return (
                <li
                  key={zone.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-foreground">
                    <Checkbox
                      checked={choice?.isSelected ?? false}
                      disabled={!canManage}
                      onChange={(event) =>
                        updateAreaChoice(zone.id, { isSelected: event.target.checked })
                      }
                    />
                    <span className="font-medium">{zone.name}</span>
                    <span className="text-muted-foreground">{zone.cities.join(", ")}</span>
                  </label>
                  <Input
                    aria-label={`Priority for ${zone.name}`}
                    type="number"
                    className="w-20"
                    min={FIRST_PRIORITY}
                    max={MAX_ZONE_PRIORITY}
                    disabled={!canManage || !choice?.isSelected}
                    value={choice?.priority ?? FIRST_PRIORITY}
                    onChange={(event) =>
                      updateAreaChoice(zone.id, { priority: Number(event.target.value) })
                    }
                  />
                </li>
              );
            })}
          </ul>
          {canManage && (
            <Button onClick={saveAreas} isLoading={replaceZones.isPending}>
              Save areas
            </Button>
          )}
        </>
      )}
    </section>
  );
};
