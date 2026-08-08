"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../../schemas/forgotPassword.schema";
import { useForgotPassword } from "../../hooks/useForgotPassword";
import { getAuthErrorMessage } from "../../utils/authErrors";
import { ForgotPasswordSuccess } from "./ForgotPasswordSuccess";

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const showPending = useDelayedPending(forgotPassword.isPending);
  const searchParams = useSearchParams();

  const linkExpired = searchParams.get("expired") === "1";

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await forgotPassword.mutateAsync(values);
    } catch {
      // Surfaced below via forgotPassword.error.
    }
  });

  if (forgotPassword.isSuccess) return <ForgotPasswordSuccess />;

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

      {forgotPassword.isError && (
        <FormBanner>{getAuthErrorMessage(forgotPassword.error.code)}</FormBanner>
      )}

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

          <Button type="submit" className="mt-6 w-full" disabled={forgotPassword.isPending}>
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
}
