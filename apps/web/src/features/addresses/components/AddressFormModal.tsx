"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import { CityAutocomplete } from "@/features/delivery-zones";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { type Address, type AddressFormInput, addressFormSchema } from "../api/addressSchemas";
import { useCreateAddress } from "../hooks/useCreateAddress";
import { useUpdateAddress } from "../hooks/useUpdateAddress";

type AddressFormModalProps = {
  address?: Address;
  onClose: () => void;
};

const toDefaultValues = (address: Address | undefined): AddressFormInput => ({
  label: address?.label ?? "",
  fullName: address?.fullName ?? "",
  phone: address?.phone ?? "",
  address: address?.address ?? "",
  city: address?.city ?? "",
  landmark: address?.landmark ?? "",
  isDefault: address?.isDefault ?? false,
});

export const AddressFormModal = ({ address, onClose }: AddressFormModalProps) => {
  const isEditing = address !== undefined;
  const lockDefaultChecked = address?.isDefault ?? false;

  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const activeMutation = isEditing ? updateAddress : createAddress;

  const form = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: toDefaultValues(address),
    mode: "onBlur",
  });

  const submitAddress = form.handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await updateAddress.mutateAsync({ id: address.id, input: values });
      } else {
        await createAddress.mutateAsync(values);
      }
      onClose();
    } catch {
      // surfaced via the FormBanner below
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? "Edit address" : "Add address"}
      ariaLabel={isEditing ? "Edit address" : "Add address"}
    >
      <Form {...form}>
        <form onSubmit={submitAddress} noValidate>
          {activeMutation.isError && (
            <FormBanner className="mb-4">{getErrorMessage(activeMutation.error)}</FormBanner>
          )}

          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Home, Office…" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="mt-0">
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Tole, ward, house no." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field: { ref, name, value, onChange, onBlur } }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <CityAutocomplete
                      ref={ref}
                      name={name}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="landmark"
              render={({ field }) => (
                <FormItem className="mt-0">
                  <FormLabel>Landmark (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Near Shankhamul bridge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="mt-4">
                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <FormControl>
                    <Checkbox
                      ref={field.ref}
                      name={field.name}
                      checked={lockDefaultChecked || field.value}
                      disabled={lockDefaultChecked}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  </FormControl>
                  Use as my default delivery address
                </label>
              </FormItem>
            )}
          />

          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={activeMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={activeMutation.isPending}>
              {activeMutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Add address"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
