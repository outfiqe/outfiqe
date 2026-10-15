"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Textarea,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import { CityAutocomplete } from "@/features/delivery-zones";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { PickupLocation } from "../api/pickupLocationSchemas";
import { useSavePickupLocation } from "../hooks/useSavePickupLocation";
import {
  type PickupLocationFormInput,
  pickupLocationFormSchema,
} from "../schemas/pickupLocationForm.schema";
import {
  toPickupLocationFormValues,
  toPickupLocationRequestBody,
} from "../utils/pickupLocationForm.utils";

type PickupLocationFormModalProps = {
  pickupLocation?: PickupLocation;
  onClose: () => void;
};

export const PickupLocationFormModal = ({
  pickupLocation,
  onClose,
}: PickupLocationFormModalProps) => {
  const isEditing = pickupLocation !== undefined;
  const title = isEditing ? "Edit pickup location" : "Add pickup location";
  const savePickupLocation = useSavePickupLocation();

  const form = useForm<PickupLocationFormInput>({
    resolver: zodResolver(pickupLocationFormSchema),
    defaultValues: toPickupLocationFormValues(pickupLocation),
    mode: "onBlur",
  });

  const submitPickupLocation = form.handleSubmit(async (values) => {
    const savedLocation = await savePickupLocation
      .mutateAsync({
        locationId: pickupLocation?.id ?? null,
        body: toPickupLocationRequestBody(values),
      })
      .catch(() => null);
    if (savedLocation) onClose();
  });

  return (
    <Modal open onClose={onClose} title={title} ariaLabel={title}>
      <Form {...form}>
        <form onSubmit={submitPickupLocation} noValidate>
          {savePickupLocation.isError && (
            <FormBanner className="mb-4">{getErrorMessage(savePickupLocation.error)}</FormBanner>
          )}

          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location name</FormLabel>
                <FormControl>
                  <Input placeholder="Studio, Warehouse…" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact person</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem className="mt-0">
                  <FormLabel>Contact phone</FormLabel>
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
                  <Input placeholder="Tole, ward, house or shop number" {...field} />
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
                    <Input placeholder="Opposite the temple gate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="mapPin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Map pin (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="27.6766, 85.3132"
                    inputMode="decimal"
                    aria-describedby="map-pin-hint"
                    {...field}
                  />
                </FormControl>
                <p id="map-pin-hint" className="mt-1 text-xs text-muted-foreground">
                  In Google Maps, press and hold your location and copy the numbers shown. Riders
                  find you faster with a pin.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openingNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening hours note (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Closed on Saturdays" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={savePickupLocation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savePickupLocation.isPending}>
              {savePickupLocation.isPending ? "Saving…" : "Save location"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
