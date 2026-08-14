"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/PasswordInput";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { useBrandRegister } from "../hooks/useBrandRegister";
import { type BrandRegisterInput, brandRegisterSchema } from "../schemas/brandRegister.schema";
import { getAuthErrorMessage } from "../utils/authErrors";

type BrandRegisterFormProps = {
  inviteToken: string;
  email: string;
  brandName: string;
};

export const BrandRegisterForm = ({ inviteToken, email, brandName }: BrandRegisterFormProps) => {
  const brandRegister = useBrandRegister();
  const showPending = useDelayedPending(brandRegister.isPending);

  const form = useForm<BrandRegisterInput>({
    resolver: zodResolver(brandRegisterSchema),
    defaultValues: { inviteToken, name: "", phone: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await brandRegister.mutateAsync(values);
    } catch {
      // Surfaced below via brandRegister.error.
    }
  });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Set up your account</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        {brandName} is approved — this just creates your login.
      </p>

      <div className="mt-5 rounded-lg bg-muted px-3.5 py-3">
        <Label htmlFor="brand-invite-email" className="mb-1">
          Email
        </Label>
        <input
          id="brand-invite-email"
          value={email}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          aria-describedby="brand-invite-email-note"
          className="w-full bg-transparent text-sm text-foreground outline-none"
        />
        <p id="brand-invite-email-note" className="mt-1 text-xs text-muted-foreground">
          This is the email your invite was sent to.
        </p>
      </div>

      {brandRegister.isError && (
        <FormBanner>{getAuthErrorMessage(brandRegister.error.code)}</FormBanner>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="mt-4">
          <FormField
            control={form.control}
            name="name"
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
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormDescription>Nepal number, e.g. 9812345678</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-6 w-full" disabled={brandRegister.isPending}>
            {showPending ? "Setting up…" : "Set up my account"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
