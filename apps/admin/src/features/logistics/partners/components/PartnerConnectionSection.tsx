import { Badge, toast } from "@outfiqe/design-system";
import { Copy } from "lucide-react";

import type { DeliveryPartner } from "../api/partnersSchemas";
import { NO_WEBHOOKS, WEBHOOK_VERIFICATION_LABELS } from "../constants/partnerLabels";

const NO_ACCOUNTS = 0;

type PartnerAccount = DeliveryPartner["accounts"][number];

const SECRET_CHECKS: { field: keyof PartnerAccount["credentials"]; label: string }[] = [
  { field: "hasApiKey", label: "API key" },
  { field: "hasBaseUrl", label: "API address" },
  { field: "hasWebhookSecret", label: "Update secret" },
  { field: "hasPreviousWebhookSecret", label: "Old update secret (only while rotating)" },
];

const copyWebhookUrl = async (webhookUrl: string) => {
  try {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("Address copied.");
  } catch {
    toast.error("Couldn't copy. Select the address and copy it by hand.");
  }
};

type PartnerConnectionSectionProps = { partner: DeliveryPartner };

export const PartnerConnectionSection = ({ partner }: PartnerConnectionSectionProps) => {
  const { webhookUrl, webhookVerification, accounts } = partner;
  const sendsUpdates = webhookVerification !== NO_WEBHOOKS;

  return (
    <section aria-labelledby="partner-connection-heading" className="space-y-3">
      <h2 id="partner-connection-heading" className="text-lg font-semibold text-foreground">
        Connection
      </h2>
      <p className="text-sm text-muted-foreground">
        Parcels are booked with this partner automatically.{" "}
        {WEBHOOK_VERIFICATION_LABELS[webhookVerification]}.
      </p>

      {sendsUpdates && webhookUrl && (
        <div className="space-y-1 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold text-foreground">Where they send updates</p>
          <p className="text-sm text-muted-foreground">
            Paste this address, and the update secret from the password manager, into their
            dashboard.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-sm">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyWebhookUrl(webhookUrl)}
              className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Copy the update address"
            >
              <Copy className="size-4" />
            </button>
          </div>
        </div>
      )}

      {accounts.length === NO_ACCOUNTS ? (
        <p className="text-sm text-muted-foreground">
          Add a hub account below, with the secret name, to connect it.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map(({ hubId, hubName, credentialsKey, credentials }) => (
            <li key={hubId} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-foreground">
                {hubName}
                {credentialsKey ? ` · ${credentialsKey}` : " · no secret name yet"}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Secrets set for ${hubName}`}>
                {SECRET_CHECKS.map(({ field, label }) => (
                  <li key={field}>
                    <Badge tone={credentials[field] ? "positive" : "neutral"} showDot={false}>
                      {label}: {credentials[field] ? "set" : "not set"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
