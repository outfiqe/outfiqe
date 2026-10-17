"use client";

import { Button, Checkbox, FormBanner, Input, Label, Select } from "@outfiqe/design-system";
import { RefundDestinationKind } from "@outfiqe/types";
import { type FormEvent, useId, useState } from "react";

import { useNepalBanks } from "@/features/nepal-banks";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { MyRefundDestination, SaveRefundDestinationBody } from "../api/refundSchemas";
import { REFUND_DESTINATION_KIND_LABELS } from "../constants/refundLabels";
import { useSaveRefundDestination } from "../hooks/useSaveRefundDestination";
import { isRefundDestinationKind } from "../utils/refundDestination.utils";

type RefundDetailsCardProps = {
  orderId: string;
  refundDestination: MyRefundDestination;
};

const NO_BANK_CHOSEN = "";

const describeSavedDestination = ({
  kind,
  walletId,
  bankName,
  accountNumberLast4,
}: NonNullable<MyRefundDestination["destination"]>) =>
  kind === RefundDestinationKind.BANK
    ? `${bankName ?? "Bank"} account ending ${accountNumberLast4 ?? ""}`
    : `${REFUND_DESTINATION_KIND_LABELS[kind]} ${walletId ?? ""}`;

export const RefundDetailsCard = ({ orderId, refundDestination }: RefundDetailsCardProps) => {
  const { amountAwaitingDetails, canEdit, destination } = refundDestination;
  const saveDestination = useSaveRefundDestination(orderId);
  const { data: banks } = useNepalBanks();
  const [isEditing, setIsEditing] = useState(destination === null);
  const [kind, setKind] = useState<RefundDestinationKind>(
    destination?.kind ?? refundDestination.suggestedKind ?? RefundDestinationKind.KHALTI,
  );
  const [walletId, setWalletId] = useState(
    destination?.walletId ?? refundDestination.suggestedWalletId,
  );
  const [bankId, setBankId] = useState(destination?.bankId ?? NO_BANK_CHOSEN);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState(
    destination?.accountName ?? refundDestination.suggestedAccountName,
  );
  const [confirmsOwnership, setConfirmsOwnership] = useState(false);
  const fieldIdPrefix = useId();
  const isBank = kind === RefundDestinationKind.BANK;

  const submitRefundDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmsOwnership) return;
    const body: SaveRefundDestinationBody = isBank
      ? { kind, bankId, accountNumber, accountName, confirmsOwnership }
      : { kind, walletId, accountName, confirmsOwnership };
    saveDestination.mutate(body, { onSuccess: () => setIsEditing(false) });
  };

  return (
    <section
      aria-labelledby="refund-details-heading"
      className="mt-4 rounded-2xl border border-border p-5"
    >
      <h2
        id="refund-details-heading"
        className="font-display text-base font-extrabold text-foreground"
      >
        {canEdit
          ? `Where should we send your Rs. ${amountAwaitingDetails.toLocaleString()} refund?`
          : "Refund account"}
      </h2>

      {!isEditing && destination && (
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">{describeSavedDestination(destination)}</span>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Change
            </Button>
          )}
        </div>
      )}

      {isEditing && canEdit && (
        <form onSubmit={submitRefundDetails} className="mt-3 space-y-3">
          {saveDestination.isError && (
            <FormBanner>{getErrorMessage(saveDestination.error)}</FormBanner>
          )}
          <div>
            <Label htmlFor={`${fieldIdPrefix}-kind`}>Send it to</Label>
            <Select
              id={`${fieldIdPrefix}-kind`}
              value={kind}
              onChange={(event) => {
                if (isRefundDestinationKind(event.target.value)) setKind(event.target.value);
              }}
            >
              {Object.values(RefundDestinationKind).map((destinationKind) => (
                <option key={destinationKind} value={destinationKind}>
                  {REFUND_DESTINATION_KIND_LABELS[destinationKind]}
                </option>
              ))}
            </Select>
          </div>

          {isBank ? (
            <>
              <div>
                <Label htmlFor={`${fieldIdPrefix}-bank`}>Bank</Label>
                <Select
                  id={`${fieldIdPrefix}-bank`}
                  value={bankId}
                  onChange={(event) => setBankId(event.target.value)}
                  required
                >
                  <option value={NO_BANK_CHOSEN}>Choose your bank</option>
                  {banks?.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`${fieldIdPrefix}-account`}>Account number</Label>
                <Input
                  id={`${fieldIdPrefix}-account`}
                  inputMode="numeric"
                  autoComplete="off"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor={`${fieldIdPrefix}-wallet`}>
                {REFUND_DESTINATION_KIND_LABELS[kind]} ID (mobile number)
              </Label>
              <Input
                id={`${fieldIdPrefix}-wallet`}
                inputMode="tel"
                value={walletId}
                onChange={(event) => setWalletId(event.target.value)}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor={`${fieldIdPrefix}-name`}>Account holder name</Label>
            <Input
              id={`${fieldIdPrefix}-name`}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              required
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={confirmsOwnership}
              onChange={(event) => setConfirmsOwnership(event.target.checked)}
            />
            This account is mine
          </label>

          <Button type="submit" disabled={!confirmsOwnership} isLoading={saveDestination.isPending}>
            Send refund details
          </Button>
        </form>
      )}
    </section>
  );
};
