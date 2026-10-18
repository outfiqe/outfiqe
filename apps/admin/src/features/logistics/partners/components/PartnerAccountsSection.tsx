import { Button, Checkbox, Input, Label } from "@outfiqe/design-system";
import { type FormEvent, useId, useState } from "react";

import type { Hub } from "../../hubs/api/hubsSchemas";
import type { DeliveryPartner } from "../api/partnersSchemas";
import { useSavePartnerAccount } from "../hooks/useSavePartnerAccount";

const NO_HUBS = 0;

type PartnerAccount = DeliveryPartner["accounts"][number];

const toOptionalText = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
};

const HubAccountForm = ({
  partnerId,
  hub,
  account,
  canManage,
}: {
  partnerId: string;
  hub: Hub;
  account: PartnerAccount | undefined;
  canManage: boolean;
}) => {
  const saveAccount = useSavePartnerAccount(partnerId);
  const [merchantAccountRef, setMerchantAccountRef] = useState(account?.merchantAccountRef ?? "");
  const [pickupPointRef, setPickupPointRef] = useState(account?.pickupPointRef ?? "");
  const [credentialsKey, setCredentialsKey] = useState(account?.credentialsKey ?? "");
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const fieldIdPrefix = useId();

  const submitAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveAccount.mutate({
      hubId: hub.id,
      account: {
        merchantAccountRef: merchantAccountRef.trim(),
        pickupPointRef: toOptionalText(pickupPointRef),
        credentialsKey: toOptionalText(credentialsKey),
        isActive,
      },
    });
  };

  return (
    <form onSubmit={submitAccount} className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold text-foreground">{hub.name}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${fieldIdPrefix}-merchant`}>Our merchant account</Label>
          <Input
            id={`${fieldIdPrefix}-merchant`}
            value={merchantAccountRef}
            disabled={!canManage}
            onChange={(event) => setMerchantAccountRef(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-pickup`}>Hub pickup point (optional)</Label>
          <Input
            id={`${fieldIdPrefix}-pickup`}
            value={pickupPointRef}
            disabled={!canManage}
            onChange={(event) => setPickupPointRef(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-credentials`}>Secret name in settings (optional)</Label>
          <Input
            id={`${fieldIdPrefix}-credentials`}
            value={credentialsKey}
            placeholder="e.g. PATHAO_KTM"
            disabled={!canManage}
            onChange={(event) => setCredentialsKey(event.target.value)}
          />
        </div>
      </div>
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Use this account
          </label>
          <Button type="submit" size="sm" isLoading={saveAccount.isPending}>
            Save account
          </Button>
        </div>
      )}
    </form>
  );
};

type PartnerAccountsSectionProps = {
  partner: DeliveryPartner;
  hubs: Hub[];
  canManage: boolean;
};

export const PartnerAccountsSection = ({
  partner,
  hubs,
  canManage,
}: PartnerAccountsSectionProps) => {
  const countryHubs = hubs.filter((hub) => hub.countryCode === partner.countryCode);

  return (
    <section aria-labelledby="partner-accounts-heading" className="space-y-3">
      <h2 id="partner-accounts-heading" className="text-lg font-semibold text-foreground">
        Hub accounts
      </h2>
      <p className="text-sm text-muted-foreground">
        The account the partner opened for us at each hub. Parcels are booked under it.
      </p>
      {countryHubs.length === NO_HUBS ? (
        <p className="text-sm text-muted-foreground">No hubs in this partner&apos;s country yet.</p>
      ) : (
        countryHubs.map((hub) => (
          <HubAccountForm
            key={hub.id}
            partnerId={partner.id}
            hub={hub}
            account={partner.accounts.find((account) => account.hubId === hub.id)}
            canManage={canManage}
          />
        ))
      )}
    </section>
  );
};
