"use client";

import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { buildOAuthLinkStartUrl } from "../../api/oauthApi";
import { useLinkedAccounts } from "../../hooks/useLinkedAccounts";
import { OAuthProvider } from "../../types";
import { UnlinkAccountModal } from "./UnlinkAccountModal";

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  [OAuthProvider.GOOGLE]: "Google",
  [OAuthProvider.FACEBOOK]: "Facebook",
};

export const ConnectedAccounts = ({ hasPassword }: { hasPassword: boolean }) => {
  const { data: linkedAccounts, isPending, isError } = useLinkedAccounts();
  const [unlinkTarget, setUnlinkTarget] = useState<OAuthProvider | null>(null);

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <FormBanner>We couldn&apos;t load your connected accounts. Please try again.</FormBanner>
    );
  }

  const linkedByProvider = new Map(linkedAccounts.map((account) => [account.provider, account]));
  const isSoleAuthMethod = !hasPassword && linkedAccounts.length <= 1;

  return (
    <div className="space-y-3">
      {Object.values(OAuthProvider).map((provider) => {
        const linkedAccount = linkedByProvider.get(provider);

        return (
          <div
            key={provider}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{PROVIDER_LABELS[provider]}</p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {linkedAccount ? `Connected as ${linkedAccount.emailAtLinkTime}` : "Not connected"}
              </p>
            </div>

            {linkedAccount ? (
              <div className="flex shrink-0 items-center gap-2.5">
                <Badge tone="positive">Connected</Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkTarget(provider)}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <a href={buildOAuthLinkStartUrl(provider)}>Connect</a>
              </Button>
            )}
          </div>
        );
      })}

      {unlinkTarget && (
        <UnlinkAccountModal
          provider={unlinkTarget}
          requiresPassword={hasPassword}
          isSoleAuthMethod={isSoleAuthMethod}
          onClose={() => setUnlinkTarget(null)}
        />
      )}
    </div>
  );
};
