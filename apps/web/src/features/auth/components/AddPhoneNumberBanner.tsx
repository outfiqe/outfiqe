"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
} from "@outfiqe/design-system";
import { Smartphone } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { useAddPhoneNumber } from "../hooks/useAddPhoneNumber";
import { type AddPhoneNumberInput, addPhoneNumberSchema } from "../schemas/addPhoneNumber.schema";
import { getAuthErrorMessage } from "../utils/authErrors";

export const AddPhoneNumberBanner = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const addPhoneNumber = useAddPhoneNumber();
  const { isPending, error, isError, isSuccess, mutateAsync } = addPhoneNumber;
  const showPending = useDelayedPending(isPending);

  const form = useForm<AddPhoneNumberInput>({
    resolver: zodResolver(addPhoneNumberSchema),
    defaultValues: { phone: "" },
  });

  if (isSuccess) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch {
      // Surfaced below via addPhoneNumber.error.
    }
  });

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Smartphone aria-hidden className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Add a phone number</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            You signed up with a social account, so we don&apos;t have a phone number for you yet.
            Adding one helps us reach you about your orders.
          </p>

          {isFormOpen ? (
            <Form {...form}>
              <form onSubmit={onSubmit} noValidate className="mt-3">
                {isError && <FormBanner>{getAuthErrorMessage(error.code)}</FormBanner>}

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="tel" autoComplete="tel" placeholder="98XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-3 flex gap-2.5">
                  <Button type="submit" size="sm" disabled={isPending}>
                    {showPending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Button type="button" size="sm" className="mt-3" onClick={() => setIsFormOpen(true)}>
              Add phone number
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
