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
} from "@outfiqe/design-system";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormFieldError } from "@/components/FormFieldError";
import { PasswordInput } from "@/components/PasswordInput";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { CaptchaChallenge } from "../../components/CaptchaChallenge";
import { ContinueWithOAuthButtons } from "../../components/ContinueWithOAuthButtons";
import { useRegister } from "../../hooks/useRegister";
import { type RegisterInput, registerSchema } from "../../schemas/register.schema";
import { AuthErrorCode, getAuthErrorMessage } from "../../utils/authErrors";
import { getSafeRedirect } from "../../utils/safeRedirect";
import { RegisterSuccess } from "./RegisterSuccess";

const DEFAULT_OAUTH_REDIRECT = "/profile";

export const RegisterForm = () => {
  const register = useRegister();
  const showPending = useDelayedPending(register.isPending);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const searchParams = useSearchParams();
  const oauthRedirectAfter =
    getSafeRedirect(searchParams.get("redirect")) ?? DEFAULT_OAUTH_REDIRECT;

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync({ ...values, captchaToken });
    } catch {
      // Surfaced below via register.error.
    }
  });

  if (register.isSuccess) {
    return (
      <RegisterSuccess
        onGoBack={() => {
          register.reset();
          form.reset();
        }}
      />
    );
  }

  const isUserExists = register.error?.code === AuthErrorCode.USER_EXISTS;
  const isPhoneExists = register.error?.code === AuthErrorCode.PHONE_EXISTS;
  const isCaptchaFailed = register.error?.code === AuthErrorCode.CAPTCHA_FAILED;
  const isUnexpectedError = register.isError && !isUserExists && !isPhoneExists && !isCaptchaFailed;

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Create your account</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Free to join. No account needed to browse.
      </p>

      {isUnexpectedError && <FormBanner>{getAuthErrorMessage(register.error?.code)}</FormBanner>}
      {isCaptchaFailed && <FormBanner>{getAuthErrorMessage(register.error?.code)}</FormBanner>}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="mt-6">
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
                {isUserExists && (
                  <FormFieldError>
                    An account with this email already exists.{" "}
                    <Link href="/login" className="underline underline-offset-2">
                      Sign in instead?
                    </Link>
                  </FormFieldError>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormDescription>Nepal number, e.g. 9812345678</FormDescription>
                <FormMessage />
                {isPhoneExists && (
                  <FormFieldError>An account with this phone number already exists.</FormFieldError>
                )}
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

          <CaptchaChallenge
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(undefined)}
          />

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={register.isPending || !captchaToken}
          >
            {showPending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <ContinueWithOAuthButtons redirectAfter={oauthRedirectAfter} />

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
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
