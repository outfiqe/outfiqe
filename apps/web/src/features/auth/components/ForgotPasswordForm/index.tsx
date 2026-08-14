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
  Input,
} from "@outfiqe/design-system";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { useForgotPassword } from "../../hooks/useForgotPassword";
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from "../../schemas/forgotPassword.schema";
import { getAuthErrorMessage } from "../../utils/authErrors";
import { ForgotPasswordSuccess } from "./ForgotPasswordSuccess";

export const ForgotPasswordForm = () => {
  const forgotPassword = useForgotPassword();
  const { isPending, isSuccess, isError, error, mutateAsync } = forgotPassword;
  const showPending = useDelayedPending(isPending);
  const searchParams = useSearchParams();

  const linkExpired = searchParams.get("expired") === "1";

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch {
      // Surfaced below via forgotPassword.error.
    }
  });

  if (isSuccess) return <ForgotPasswordSuccess />;

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">Reset your password</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        We&apos;ll send a link to your email address.
      </p>

      {linkExpired && (
        <FormBanner>
          That link is no longer valid. Enter your email to request a new one.
        </FormBanner>
      )}

      {isError && <FormBanner>{getAuthErrorMessage(error.code)}</FormBanner>}

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

          <Button type="submit" className="mt-6 w-full" disabled={isPending}>
            {showPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </Form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remember it?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};
