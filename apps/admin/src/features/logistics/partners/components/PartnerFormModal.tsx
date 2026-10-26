import { Button, Checkbox, FormBanner, Input, Label, Modal, Select } from "@outfiqe/design-system";
import { describeFixedTextPatternProblem, isFixedTextPattern } from "@outfiqe/utils";
import { type FormEvent, useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import {
  type DeliveryPartner,
  WEBHOOK_VERIFICATIONS,
  type WebhookVerification,
} from "../api/partnersSchemas";
import {
  ADAPTER_LABELS,
  CONNECTED_PARTNER_HINTS,
  DEFAULT_COD_REMITTANCE_DAYS,
  DEFAULT_PARTNER_COUNTRY_CODE,
  MANUAL_ADAPTER_KEY,
  MAX_COD_REMITTANCE_DAYS,
  NO_WEBHOOKS,
  REFERENCE_PATTERN_HINT,
  WEBHOOK_VERIFICATION_LABELS,
} from "../constants/partnerLabels";
import { useSaveDeliveryPartner } from "../hooks/useSaveDeliveryPartner";

const MIN_COD_REMITTANCE_DAYS = 0;

const readWebhookVerification = (value: string): WebhookVerification =>
  WEBHOOK_VERIFICATIONS.find((verification) => verification === value) ?? NO_WEBHOOKS;

type PartnerFormModalProps = { partner: DeliveryPartner | null; onClose: () => void };

const toOptionalText = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
};

const describeReferencePatternProblem = (referencePattern: string): string | null => {
  const pattern = toOptionalText(referencePattern);
  if (pattern === null || !isFixedTextPattern(pattern)) return null;
  return describeFixedTextPatternProblem(pattern);
};

export const PartnerFormModal = ({ partner, onClose }: PartnerFormModalProps) => {
  const savePartner = useSaveDeliveryPartner(partner?.id ?? null);
  const [code, setCode] = useState(partner?.code ?? "");
  const [name, setName] = useState(partner?.name ?? "");
  const [adapterKey, setAdapterKey] = useState(partner?.adapterKey ?? MANUAL_ADAPTER_KEY);
  const [webhookVerification, setWebhookVerification] = useState<WebhookVerification>(
    partner?.webhookVerification ?? NO_WEBHOOKS,
  );
  const [supportsCod, setSupportsCod] = useState(partner?.supportsCod ?? true);
  const isConnectedPartner = adapterKey !== MANUAL_ADAPTER_KEY;
  const [isActive, setIsActive] = useState(partner?.isActive ?? true);
  const [referencePattern, setReferencePattern] = useState(partner?.referencePattern ?? "");
  const [codRemittanceDays, setCodRemittanceDays] = useState(
    String(partner?.codRemittanceDays ?? DEFAULT_COD_REMITTANCE_DAYS),
  );
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState(
    partner?.trackingUrlTemplate ?? "",
  );
  const fieldIdPrefix = useId();
  const referencePatternProblem = describeReferencePatternProblem(referencePattern);

  const submitPartner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (referencePatternProblem) return;
    savePartner.mutate(
      {
        code: code.trim(),
        name: name.trim(),
        countryCode: partner?.countryCode ?? DEFAULT_PARTNER_COUNTRY_CODE,
        adapterKey,
        isActive,
        supportsCod,
        webhookVerification: isConnectedPartner ? webhookVerification : NO_WEBHOOKS,
        referencePattern: toOptionalText(referencePattern),
        codRemittanceDays: Number(codRemittanceDays),
        trackingUrlTemplate: toOptionalText(trackingUrlTemplate),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={partner ? `Edit ${partner.name}` : "Add a delivery partner"}
      description="The courier company that delivers parcels from the hub. Their login details stay in the password manager, never here."
    >
      <form onSubmit={submitPartner} className="space-y-3">
        {savePartner.isError && <FormBanner>{getErrorMessage(savePartner.error)}</FormBanner>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${fieldIdPrefix}-name`}>Name</Label>
            <Input
              id={`${fieldIdPrefix}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor={`${fieldIdPrefix}-code`}>Short code</Label>
            <Input
              id={`${fieldIdPrefix}-code`}
              value={code}
              placeholder="e.g. pathao"
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-adapter`}>Connection</Label>
          <Select
            id={`${fieldIdPrefix}-adapter`}
            value={adapterKey}
            onChange={(event) => setAdapterKey(event.target.value)}
          >
            {Object.entries(ADAPTER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          {isConnectedPartner && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {CONNECTED_PARTNER_HINTS.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
        {isConnectedPartner && (
          <div>
            <Label htmlFor={`${fieldIdPrefix}-verification`}>How they send parcel updates</Label>
            <Select
              id={`${fieldIdPrefix}-verification`}
              value={webhookVerification}
              onChange={(event) =>
                setWebhookVerification(readWebhookVerification(event.target.value))
              }
            >
              {WEBHOOK_VERIFICATIONS.map((verification) => (
                <option key={verification} value={verification}>
                  {WEBHOOK_VERIFICATION_LABELS[verification]}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor={`${fieldIdPrefix}-pattern`}>Their parcel number pattern (optional)</Label>
          <Input
            id={`${fieldIdPrefix}-pattern`}
            value={referencePattern}
            placeholder="e.g. PX-\d{5}"
            aria-invalid={referencePatternProblem !== null}
            aria-describedby={`${fieldIdPrefix}-pattern-hint`}
            onChange={(event) => setReferencePattern(event.target.value)}
          />
          <p
            id={`${fieldIdPrefix}-pattern-hint`}
            className={
              referencePatternProblem
                ? "mt-1 text-sm text-destructive"
                : "mt-1 text-xs text-muted-foreground"
            }
          >
            {referencePatternProblem ?? REFERENCE_PATTERN_HINT}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${fieldIdPrefix}-remittance`}>Days to pay us the cash</Label>
            <Input
              id={`${fieldIdPrefix}-remittance`}
              type="number"
              min={MIN_COD_REMITTANCE_DAYS}
              max={MAX_COD_REMITTANCE_DAYS}
              value={codRemittanceDays}
              onChange={(event) => setCodRemittanceDays(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${fieldIdPrefix}-tracking`}>Public tracking link (optional)</Label>
            <Input
              id={`${fieldIdPrefix}-tracking`}
              value={trackingUrlTemplate}
              placeholder="https://partner.example/track/{reference}"
              onChange={(event) => setTrackingUrlTemplate(event.target.value)}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={supportsCod}
            onChange={(event) => setSupportsCod(event.target.checked)}
          />
          Collects cash on delivery
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Active — new parcels can go to this partner
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={savePartner.isPending}
            disabled={referencePatternProblem !== null}
          >
            Save partner
          </Button>
        </div>
      </form>
    </Modal>
  );
};
