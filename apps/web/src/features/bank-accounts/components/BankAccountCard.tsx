"use client";

import { Badge, Button, toast } from "@outfiqe/design-system";
import { Landmark } from "lucide-react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BankAccount, OwnerTypeValue } from "../api/bankAccountSchemas";
import { useSetDefaultBankAccount } from "../hooks/useSetDefaultBankAccount";

type BankAccountCardProps = {
  ownerType: OwnerTypeValue;
  bankAccount: BankAccount;
};

export const BankAccountCard = ({ ownerType, bankAccount }: BankAccountCardProps) => {
  const setDefault = useSetDefaultBankAccount(ownerType);
  const { id, bankName, accountName, accountNumberLast4, branchName, isDefault, isVerified } =
    bankAccount;

  const makeDefault = async () => {
    try {
      await setDefault.mutateAsync(id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border p-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
        <Landmark className="size-5 text-foreground/60" strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {bankName} •••• {accountNumberLast4}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {accountName} · {branchName}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {isDefault && (
          <Badge tone="positive" showDot={false}>
            Default
          </Badge>
        )}
        {!isVerified && (
          <Badge tone="neutral" showDot={false}>
            Pending verification
          </Badge>
        )}
        {!isDefault && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void makeDefault()}
            disabled={setDefault.isPending}
          >
            Set as default
          </Button>
        )}
      </div>
    </div>
  );
};
