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
} from "@outfiqe/design-system";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/PasswordInput";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { ApiClientError } from "@/shared/lib/apiClient";

import { useChangePassword } from "../../hooks/useChangePassword";
import {
  type ChangePasswordInput,
  changePasswordSchema,
} from "../../schemas/changePassword.schema";
import { AuthErrorCode, getAuthErrorMessage } from "../../utils/authErrors";

const EMPTY_FORM: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export const ChangePasswordCard = ({ hasPassword }: { hasPassword: boolean }) => {
  const changePassword = useChangePassword();
  const { isPending, mutateAsync } = changePassword;
  const showPending = useDelayedPending(isPending);
  const [justSaved, setJustSaved] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY_FORM,
    mode: "onBlur",
  });

  if (!hasPassword) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-[13px] text-muted-foreground">
        You sign in with a connected account, so there&apos;s no password to change.{" "}
        <Link href="/forgot-password" className="font-medium text-foreground underline">
          Set a password
        </Link>{" "}
        to also sign in with an email and password.
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setJustSaved(false);
    try {
      await mutateAsync(values);
      form.reset(EMPTY_FORM);
      setJustSaved(true);
    } catch (error) {
      const code = error instanceof ApiClientError ? error.code : undefined;
      if (code === AuthErrorCode.INVALID_CURRENT_PASSWORD) {
        form.setError("currentPassword", { message: getAuthErrorMessage(code) ?? undefined });
        return;
      }
      if (code === AuthErrorCode.PASSWORD_UNCHANGED || code === AuthErrorCode.PASSWORD_BREACHED) {
        form.setError("newPassword", { message: getAuthErrorMessage(code) ?? undefined });
        return;
      }
      form.setError("root", { message: getAuthErrorMessage(code) ?? "Something went wrong." });
    }
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      {rootError && <FormBanner>{rootError}</FormBanner>}
      {justSaved && (
        <FormBanner tone="success">
          Password updated. Other devices have been signed out.
        </FormBanner>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmNewPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {showPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
