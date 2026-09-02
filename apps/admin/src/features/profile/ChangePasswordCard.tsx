import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { authApi } from "@/features/auth/api";
import { changePasswordInputSchema } from "@/features/auth/schemas";
import { ApiClientError } from "@/lib/apiClient";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

const errorMessageFor = (error: unknown): string => {
  if (error instanceof ApiClientError) return error.message;
  return FALLBACK_ERROR;
};

export const ChangePasswordCard = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changePassword = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setValidationError(null);
      setSaved(true);
    },
    onError: () => setSaved(false),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);

    const parsed = changePasswordInputSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }

    setValidationError(null);
    changePassword.mutate(parsed.data);
  };

  const errorMessage =
    validationError ?? (changePassword.isError ? errorMessageFor(changePassword.error) : null);

  return (
    <form
      onSubmit={submit}
      className="mt-5 max-w-lg space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Change password</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Changing your password signs out your other devices.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="current-password" className="text-xs text-muted-foreground">
          Current password
        </label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new-password" className="text-xs text-muted-foreground">
          New password
        </label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-new-password" className="text-xs text-muted-foreground">
          Confirm new password
        </label>
        <Input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
      </div>

      {errorMessage && <FormBanner>{errorMessage}</FormBanner>}
      {saved && (
        <p className="text-sm text-primary">Password updated. Other devices were signed out.</p>
      )}

      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
};
