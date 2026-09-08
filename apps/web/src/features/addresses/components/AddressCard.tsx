"use client";

import { Badge, Button, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { Address } from "../api/addressSchemas";
import { useDeleteAddress } from "../hooks/useDeleteAddress";
import { useSetDefaultAddress } from "../hooks/useSetDefaultAddress";
import { AddressFormModal } from "./AddressFormModal";

type AddressCardProps = {
  address: Address;
};

export const AddressCard = ({ address }: AddressCardProps) => {
  const { id, label, fullName, phone, address: street, city, landmark, isDefault } = address;

  const setDefaultAddress = useSetDefaultAddress();
  const deleteAddress = useDeleteAddress();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const makeDefault = async () => {
    try {
      await setDefaultAddress.mutateAsync(id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteAddress.mutateAsync(id);
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
            {isDefault && (
              <Badge tone="positive" showDot={false}>
                Default
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{fullName}</p>
          <p className="text-[13px] text-muted-foreground">{phone}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {street}, {city}
            {landmark ? ` — ${landmark}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!isDefault && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={makeDefault}
            disabled={setDefaultAddress.isPending}
          >
            Set as default
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDeleteOpen(true)}
          disabled={deleteAddress.isPending}
        >
          Delete
        </Button>
      </div>

      {isEditOpen && <AddressFormModal address={address} onClose={() => setIsEditOpen(false)} />}

      {isDeleteOpen && (
        <Modal
          open
          onClose={() => setIsDeleteOpen(false)}
          title="Delete address"
          ariaLabel="Delete address"
        >
          <p className="text-sm text-muted-foreground">
            Remove this delivery address? This can&apos;t be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteAddress.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmDelete} disabled={deleteAddress.isPending}>
              {deleteAddress.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
