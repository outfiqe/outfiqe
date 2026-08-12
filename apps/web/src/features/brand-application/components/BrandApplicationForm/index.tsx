"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  Button,
  Input,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@outfiqe/design-system";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import {
  brandApplicationSchema,
  type BrandApplicationInput,
} from "../../schemas/brandApplication.schema";
import { useSubmitBrandApplication } from "../../hooks/useSubmitBrandApplication";
import { getBrandApplicationErrorMessage } from "../../utils/errors";
import { BrandApplicationSuccess } from "./BrandApplicationSuccess";
import { ChipGroup } from "./ChildGroup";
import { CATEGORY_OPTIONS, PRODUCTION_OPTIONS } from "./brandApplicationForm.constants";

export const BrandApplicationForm = () => {
  const submit = useSubmitBrandApplication();
  const showPending = useDelayedPending(submit.isPending);

  const form = useForm<BrandApplicationInput>({
    resolver: zodResolver(brandApplicationSchema),
    defaultValues: {
      brandName: "",
      contactName: "",
      email: "",
      phone: "",
      instagram: "",
      category: "STREETWEAR",
      makesOwnPieces: "MAKES",
    },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submit.mutateAsync(values);
    } catch {
      // surfaced via submit.error below
    }
  });

  if (submit.isSuccess) return <BrandApplicationSuccess />;

  return (
    <div className="rounded-2xl bg-muted p-6 sm:p-10">
      <h3 className="font-display text-xl font-bold text-foreground">Apply to list</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We review every brand by hand. Expect a reply within a week.
      </p>

      {submit.isError && (
        <FormBanner>{getBrandApplicationErrorMessage(submit.error.code)}</FormBanner>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="mt-6 max-w-xl space-y-4">
          <FormField
            control={form.control}
            name="brandName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand name</FormLabel>
                <FormControl>
                  <Input placeholder="Kastha Studio" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input placeholder="Anjesh Shrestha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone or WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="98XXXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram or TikTok</FormLabel>
                <FormControl>
                  <Input placeholder="@kasthastudio" {...field} />
                </FormControl>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  This is where we&apos;ll look at your work.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Category
            </span>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <ChipGroup
                  label="Category"
                  options={CATEGORY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="rounded-lg border-[1.5px] border-primary bg-background p-4">
            <p className="mb-2.5 text-sm font-semibold text-primary-strong">
              Do you design or make your own pieces?
            </p>
            <Controller
              control={form.control}
              name="makesOwnPieces"
              render={({ field }) => (
                <ChipGroup
                  label="Production"
                  options={PRODUCTION_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button type="submit" disabled={submit.isPending}>
              {showPending ? "Sending…" : "Send application"}
            </Button>
            <span className="text-xs text-muted-foreground">No fee to be listed.</span>
          </div>
        </form>
      </Form>
    </div>
  );
};
