"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/components/ui/form";
import { FormBanner } from "@/components/FormBanner";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";
import { cn } from "@/shared/lib/cn";
import {
  brandApplicationSchema,
  type BrandApplicationInput,
  type BrandCategory,
  type MakesOwnPieces,
} from "../schemas/brandApplication.schema";
import { useSubmitBrandApplication } from "../hooks/useSubmitBrandApplication";
import { getBrandApplicationErrorMessage } from "../utils/errors";

const CATEGORY_OPTIONS: { value: BrandCategory; label: string }[] = [
  { value: "STREETWEAR", label: "Streetwear" },
  { value: "TRADITIONAL", label: "Traditional" },
  { value: "THRIFT", label: "Thrift" },
  { value: "KIDS", label: "Kids" },
  { value: "FORMAL", label: "Formal" },
];

const PRODUCTION_OPTIONS: { value: MakesOwnPieces; label: string }[] = [
  { value: "MAKES", label: "Yes, we make them" },
  { value: "RESELLS", label: "We resell" },
  { value: "BOTH", label: "Both" },
];

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition-colors",
            value === opt.value
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BrandApplicationSuccess() {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="rounded-2xl bg-muted p-6 text-center sm:p-10">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-xl font-bold text-foreground outline-none"
      >
        Application sent
      </h3>
      <p className="mx-auto mt-2.5 max-w-md text-sm text-muted-foreground">
        We&apos;ll look at your Instagram and get back to you within a week. If it&apos;s a fit,
        we&apos;ll send an invite link to set up your brand account.
      </p>
      <Link href="/" className="mt-5 inline-block">
        <Button variant="outline">Back to home</Button>
      </Link>
    </div>
  );
}

export function BrandApplicationForm() {
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

  if (submit.isSuccess) {
    return <BrandApplicationSuccess />;
  }

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
}
