"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import type { OwnerTypeValue } from "../api/bankAccountSchemas";
import { useBankAccounts } from "../hooks/useBankAccounts";
import { AddBankAccountModal } from "./AddBankAccountModal";
import { BankAccountCard } from "./BankAccountCard";

type BankAccountsListProps = {
  ownerType: OwnerTypeValue;
};

export const BankAccountsList = ({ ownerType }: BankAccountsListProps) => {
  const { data: bankAccounts, isPending } = useBankAccounts(ownerType);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
            Bank accounts
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A newly added account is reviewed before you can withdraw to it.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
          Add bank account
        </Button>
      </div>

      {isPending && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-[76px] w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && (bankAccounts?.length ?? 0) === 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No bank accounts yet — add one to request a withdrawal.
          </p>
        </div>
      )}

      {(bankAccounts?.length ?? 0) > 0 && (
        <div className="mt-4 space-y-3">
          {bankAccounts?.map((bankAccount) => (
            <BankAccountCard key={bankAccount.id} ownerType={ownerType} bankAccount={bankAccount} />
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddBankAccountModal ownerType={ownerType} onClose={() => setIsAddModalOpen(false)} />
      )}
    </div>
  );
};
