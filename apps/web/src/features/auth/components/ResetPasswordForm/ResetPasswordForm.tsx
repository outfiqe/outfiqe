"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/design-system/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/components/ui/form";
import { PasswordInput } from "@/components/PasswordInput";
import { FormBanner } from "@/components/FormBanner";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { resetPasswordSchema, type ResetPasswordInput } from "../../schemas/resetPassword.schema";
import { useResetPassword } from "../../hooks/useResetPassword";
import { AuthErrorCode, getAuthErrorMessage } from "../../utils/authErrors";
import { ExpiredLinkNotice } from "./ExpiredLinkNotice";

export function ResetPasswordForm({ token }: { token: string }) {
  const resetPassword = useResetPassword();
  const showPending = useDelayedPending(resetPassword.isPending);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await resetPassword.mutateAsync(values);
    } catch {
      // Surfaced below via resetPassword.error.
    }
  });

  const isTokenDead =
    resetPassword.error?.code === AuthErrorCode.INVALID_TOKEN ||
    resetPassword.error?.code === AuthErrorCode.TOKEN_EXPIRED;

  if (isTokenDead) return <ExpiredLinkNotice />;

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Choose a new password</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Pick something you haven&apos;t used before.
      </p>

      {resetPassword.isError && (
        <FormBanner>{getAuthErrorMessage(resetPassword.error.code)}</FormBanner>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="mt-6">
          <FormField
            control={form.control}
            name="password"
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

          <Button type="submit" className="mt-6 w-full" disabled={resetPassword.isPending}>
            {showPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
