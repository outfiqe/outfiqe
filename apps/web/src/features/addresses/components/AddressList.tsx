"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { NotAShopperNotice, useAuth } from "@/features/auth";

import { useAddresses } from "../hooks/useAddresses";
import { AddressCard } from "./AddressCard";
import { AddressFormModal } from "./AddressFormModal";

const SKELETON_ROW_COUNT = 2;

export const AddressList = () => {
  const { isAuthResolved, isBrandOwner, isAdmin } = useAuth();
  const { data: addresses, isPending, isError } = useAddresses();
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (!isAuthResolved) return null;

  if (isBrandOwner || isAdmin) return <NotAShopperNotice />;

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
            Delivery addresses
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved addresses show up at checkout so you don&apos;t retype them.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
          Add address
        </Button>
      </div>

      {isPending && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-[132px] w-full rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-4 text-sm text-muted-foreground">
          We couldn&apos;t load your addresses. Refresh to try again.
        </p>
      )}

      {!isPending && !isError && addresses.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No saved addresses yet — add one to speed up checkout.
          </p>
        </div>
      )}

      {!isPending && !isError && addresses.length > 0 && (
        <div className="mt-4 space-y-3">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}

      {isAddOpen && <AddressFormModal onClose={() => setIsAddOpen(false)} />}
    </div>
  );
};
