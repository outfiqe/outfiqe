import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { NEPAL_PHONE_REGEX } from "@outfiqe/utils";
import { getRouteApi, Navigate, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";

import { authApi } from "./api";
import { useAuth } from "./AuthContext";
import type { AdminInviteInfo } from "./schemas";

const PASSWORD_MIN_LENGTH = 8;
const routeApi = getRouteApi("/register");

type InviteLoadState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "valid"; invite: AdminInviteInfo };

export function RegisterInvitePage() {
  const { token } = routeApi.useSearch();
  const navigate = useNavigate();
  const { state: authState } = useAuth();

  const [inviteState, setInviteState] = useState<InviteLoadState>(() =>
    token
      ? { status: "loading" }
      : { status: "invalid", message: "This invite link is missing a token." },
  );
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    authApi
      .getAdminInvite(token)
      .then((invite) => setInviteState({ status: "valid", invite }))
      .catch((err) =>
        setInviteState({
          status: "invalid",
          message: err instanceof Error ? err.message : "This invite link is not valid.",
        }),
      );
  }, [token]);

  if (authState.status === "signed-in") return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!NEPAL_PHONE_REGEX.test(phone)) {
      setError("Enter a valid Nepali phone number starting with 98.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.registerAdmin({ inviteToken: token, phone, password });
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <span className="font-display text-2xl font-bold tracking-tight text-foreground">
        outfiqe<span className="text-primary">.</span>
        <span className="ml-1 align-middle text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Admin
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
              Set up your admin account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{inviteState.invite.email}</p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {error && <FormBanner>{error}</FormBanner>}

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs text-muted-foreground">
                  Phone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="98XXXXXXXX"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs text-muted-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Create admin account"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
