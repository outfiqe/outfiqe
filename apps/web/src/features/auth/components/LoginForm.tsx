"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import { PasswordInput } from "@/components/PasswordInput";
import { FormFieldError } from "@/components/FormFieldError";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import { useLogin } from "../hooks/useLogin";
import { useResendVerification } from "../hooks/useResendVerification";
import { AuthErrorCode, getAuthErrorMessage } from "../utils/authErrors";

export const LoginForm = () => {
  const login = useLogin();
  const resend = useResendVerification();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";
  const showPending = useDelayedPending(login.isPending);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch {
      // Surfaced below via login.error — nothing else to do here.
    }
  });

  const isEmailNotVerified = login.error?.code === AuthErrorCode.EMAIL_NOT_VERIFIED;
  const isInvalidCredentials = login.error?.code === AuthErrorCode.INVALID_CREDENTIALS;
  const isUnexpectedError = login.isError && !isEmailNotVerified && !isInvalidCredentials;
  const attemptedEmail = login.variables?.email;

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Welcome back</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">Sign in to save items and check out.</p>

      {justReset && <FormBanner>Password updated. Please sign in.</FormBanner>}

      {isEmailNotVerified && (
        <FormBanner>
          Please verify your email before signing in.{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2 disabled:opacity-60"
            disabled={resend.isPending || resend.isSuccess}
            onClick={() => attemptedEmail && resend.mutate(attemptedEmail)}
          >
            {resend.isSuccess ? "Verification email sent" : "Resend verification email"}
          </button>
        </FormBanner>
      )}

      {isUnexpectedError && <FormBanner>{getAuthErrorMessage(login.error?.code)}</FormBanner>}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="mt-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-baseline justify-between">
                  <FormLabel className="mb-1.5">Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary-strong hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
                {isInvalidCredentials && (
                  <FormFieldError>Incorrect email or password.</FormFieldError>
                )}
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-6 w-full" disabled={login.isPending}>
            {showPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Selling clothes?{" "}
        <Link href="/apply" className="font-medium text-primary-strong hover:underline">
          List your brand
        </Link>
      </p>
    </div>
  );
};
