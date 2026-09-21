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
import { useApiMutation } from "@outfiqe/hooks";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthContext";
import {
  crmRegisterFormSchema,
  type CrmRegisterFormValues,
  EMPTY_CRM_REGISTER_FORM,
} from "@/features/auth/registerForm.schema";
import type { CrmInviteInfo } from "@/features/auth/schemas";
import { setAccessToken } from "@/lib/apiClient";
import { useHideBootLoader } from "@/lib/bootLoader";
import { getErrorMessage } from "@/lib/errorMessages";

const routeApi = getRouteApi("/crm/invites/register");

type InviteLoadState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "valid"; invite: CrmInviteInfo };

export const CrmInviteRegisterPage = () => {
  useHideBootLoader();
  const { token } = routeApi.useSearch();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [inviteState, setInviteState] = useState<InviteLoadState>(() =>
    token
      ? { status: "loading" }
      : { status: "invalid", message: "This invite link is missing a token." },
  );
  const form = useForm<CrmRegisterFormValues>({
    resolver: zodResolver(crmRegisterFormSchema),
    defaultValues: EMPTY_CRM_REGISTER_FORM,
    mode: "onTouched",
  });

  const register = useApiMutation({
    mutationFn: (values: CrmRegisterFormValues) =>
      authApi.registerFromCrmInvite({ inviteToken: token, ...values, name: values.name.trim() }),
    onSuccess: ({ accessToken, user }) => {
      setAccessToken(accessToken);
      setSession(user);
      navigate({ to: "/crm", replace: true });
    },
  });

  useEffect(() => {
    if (!token) return;

    authApi
      .getCrmInvite(token)
      .then((invite) => setInviteState({ status: "valid", invite }))
      .catch((err) =>
        setInviteState({
          status: "invalid",
          message: err instanceof Error ? err.message : "This invite link is not valid.",
        }),
      );
  }, [token]);

  const submitRegistration = form.handleSubmit((values) => register.mutate(values));

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <span className="font-display text-2xl font-bold tracking-tight text-foreground">
        outfiqe<span className="text-primary">.</span>
        <span className="ml-1 align-middle text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          CRM
        </span>
      </span>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        {inviteState.status === "loading" && (
          <p className="text-sm text-muted-foreground">Checking your invite…</p>
        )}

        {inviteState.status === "invalid" && <FormBanner>{inviteState.message}</FormBanner>}

        {inviteState.status === "valid" && (
          <>
            <h1 className="font-display text-lg font-bold text-foreground">
              Join {inviteState.invite.organizationName} on Outfiqe CRM
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {inviteState.invite.email} · {inviteState.invite.roleName}
            </p>

            <Form {...form}>
              <form className="mt-5 space-y-4" noValidate onSubmit={submitRegistration}>
                {register.isError && <FormBanner>{getErrorMessage(register.error)}</FormBanner>}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-normal text-muted-foreground">
                        Full name
                      </FormLabel>
                      <FormControl>
                        <Input type="text" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-normal text-muted-foreground">
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="98XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-normal text-muted-foreground">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-normal text-muted-foreground">
                        Confirm password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" isLoading={register.isPending}>
                  Create account & join
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
};
