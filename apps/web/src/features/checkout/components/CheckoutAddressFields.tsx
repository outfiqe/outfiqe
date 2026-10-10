"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@outfiqe/design-system";
import type { Control } from "react-hook-form";

import { CityAutocomplete } from "@/features/delivery-zones";

import type { CheckoutInput } from "../api/checkoutSchemas";

type CheckoutAddressFieldsProps = {
  control: Control<CheckoutInput>;
};

export const CheckoutAddressFields = ({ control }: CheckoutAddressFieldsProps) => (
  <>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <FormField
        control={control}
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
        control={control}
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
      control={control}
      name="address"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Address</FormLabel>
          <FormControl>
            <Input placeholder="Tole, ward, landmark" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <FormField
        control={control}
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
        control={control}
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
  </>
);
