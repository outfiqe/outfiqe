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
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/PasswordInput";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { useConfirmOAuthLink } from "../../hooks/useConfirmOAuthLink";
import {
  type ConfirmOAuthLinkFormInput,
  confirmOAuthLinkSchema,
} from "../../schemas/confirmOAuthLink.schema";
import { OAuthProvider } from "../../types";
import { getAuthErrorMessage } from "../../utils/authErrors";
import { getDefaultRouteForUser } from "../../utils/getDefaultRoute";

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  [OAuthProvider.GOOGLE]: "Google",
  [OAuthProvider.FACEBOOK]: "Facebook",
};

const isOAuthProvider = (value: string | null): value is OAuthProvider =>
  value === OAuthProvider.GOOGLE || value === OAuthProvider.FACEBOOK;

const BackToSignIn = () => (
  <p className="mt-5 text-center text-sm text-muted-foreground">
    <Link href="/login" className="font-medium text-foreground hover:underline">
      Back to sign in
    </Link>
  </p>
);

export const OAuthCallbackScreen = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const confirmLink = useConfirmOAuthLink();
  const showPending = useDelayedPending(confirmLink.isPending);

  const linkToken = searchParams.get("linkToken");
  const email = searchParams.get("email");
  const provider = searchParams.get("provider");
  const errorCode = searchParams.get("error");

  const form = useForm<ConfirmOAuthLinkFormInput>({
    resolver: zodResolver(confirmOAuthLinkSchema),
    defaultValues: { password: "" },
  });

  if (linkToken && email && isOAuthProvider(provider)) {
    const providerLabel = PROVIDER_LABELS[provider];

    const onSubmit = form.handleSubmit(async (values) => {
      try {
        const { user } = await confirmLink.mutateAsync({
          provider,
          linkToken,
          password: values.password,
        });
        router.replace(getDefaultRouteForUser(user));
      } catch {
        // Surfaced below via confirmLink.error.
      }
    });

    return (
      <div>
        <h1 className="font-display text-[28px] font-bold text-foreground">
          Confirm it&apos;s you
        </h1>
        <p className="mt-2.5 text-sm text-muted-foreground">
          {email} already has an Outfiqe account. Enter its password to connect {providerLabel} and
          sign in.
        </p>

        {confirmLink.isError && (
          <FormBanner className="mt-4">{getAuthErrorMessage(confirmLink.error.code)}</FormBanner>
        )}

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="mt-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-6 w-full" disabled={confirmLink.isPending}>
              {showPending ? "Connecting…" : `Connect ${providerLabel}`}
            </Button>
          </form>
        </Form>

        <BackToSignIn />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold text-foreground">
        Sign-in didn&apos;t go through
      </h1>
      <FormBanner className="mt-4">
        {getAuthErrorMessage(errorCode ?? undefined) ?? "Something went wrong. Please try again."}
      </FormBanner>
      <BackToSignIn />
    </div>
  );
};
