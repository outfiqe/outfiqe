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
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/PasswordInput";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { useResetPassword } from "../../hooks/useResetPassword";
import { type ResetPasswordInput, resetPasswordSchema } from "../../schemas/resetPassword.schema";
import { AuthErrorCode, getAuthErrorMessage } from "../../utils/authErrors";
import { ExpiredLinkNotice } from "./ExpiredLinkNotice";

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const resetPassword = useResetPassword();
  const { isPending, error, isError, mutateAsync } = resetPassword;
  const showPending = useDelayedPending(isPending);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch {
      // Surfaced below via resetPassword.error.
    }
  });

  const isTokenDead =
    error?.code === AuthErrorCode.INVALID_TOKEN || error?.code === AuthErrorCode.TOKEN_EXPIRED;

  if (isTokenDead) return <ExpiredLinkNotice />;

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Choose a new password</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Pick something you haven&apos;t used before.
      </p>

      {isError && <FormBanner>{getAuthErrorMessage(error.code)}</FormBanner>}

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

          <Button type="submit" className="mt-6 w-full" disabled={isPending}>
            {showPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
