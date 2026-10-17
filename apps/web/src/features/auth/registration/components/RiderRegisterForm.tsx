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

import { getAuthErrorMessage } from "../../utils/authErrors";
import { useRiderRegister } from "../hooks/useRiderRegister";
import { type RiderRegisterInput, riderRegisterSchema } from "../schemas/riderRegister.schema";

type RiderRegisterFormProps = {
  inviteToken: string;
  email: string;
  name: string;
  hubName: string;
};

export const RiderRegisterForm = ({
  inviteToken,
  email,
  name,
  hubName,
}: RiderRegisterFormProps) => {
  const riderRegister = useRiderRegister();
  const showPending = useDelayedPending(riderRegister.isPending);

  const form = useForm<RiderRegisterInput>({
    resolver: zodResolver(riderRegisterSchema),
    defaultValues: { inviteToken, phone: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const submitRiderRegistration = form.handleSubmit(async (values) => {
    await riderRegister.mutateAsync(values).catch(() => undefined);
  });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Hi {name}</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Set up your rider login for {hubName}. You&apos;ll use it on your phone to collect orders.
      </p>

      <div className="mt-5 rounded-lg bg-muted px-3.5 py-3">
        <Label htmlFor="rider-invite-email" className="mb-1">
          Email
        </Label>
        <input
          id="rider-invite-email"
          value={email}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          aria-describedby="rider-invite-email-note"
          className="w-full bg-transparent text-sm text-foreground outline-none"
        />
        <p id="rider-invite-email-note" className="mt-1 text-xs text-muted-foreground">
          This is the email your invite was sent to.
        </p>
      </div>

      {riderRegister.isError && (
        <FormBanner>{getAuthErrorMessage(riderRegister.error.code)}</FormBanner>
      )}

      <Form {...form}>
        <form onSubmit={submitRiderRegistration} noValidate className="mt-4">
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

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={riderRegister.isPending}
            isLoading={showPending}
          >
            Set up my rider account
          </Button>
        </form>
      </Form>
    </div>
  );
};
