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
  Modal,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import { PasswordInput } from "@/components/PasswordInput";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";

import { useUnlinkAccount } from "../../hooks/useUnlinkAccount";
import {
  type UnlinkOAuthAccountFormInput,
  unlinkOAuthAccountSchema,
} from "../../schemas/confirmOAuthLink.schema";
import { OAuthProvider } from "../../types";
import { getAuthErrorMessage } from "../../utils/authErrors";

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  [OAuthProvider.GOOGLE]: "Google",
  [OAuthProvider.FACEBOOK]: "Facebook",
};

type UnlinkAccountModalProps = {
  provider: OAuthProvider;
  requiresPassword: boolean;
  isSoleAuthMethod: boolean;
  onClose: () => void;
};

export const UnlinkAccountModal = ({
  provider,
  requiresPassword,
  isSoleAuthMethod,
  onClose,
}: UnlinkAccountModalProps) => {
  const unlinkAccount = useUnlinkAccount();
  const { isPending, error, isError, mutateAsync } = unlinkAccount;
  const showPending = useDelayedPending(isPending);

  const form = useForm<UnlinkOAuthAccountFormInput>({
    resolver: zodResolver(unlinkOAuthAccountSchema),
    defaultValues: { password: "" },
  });

  const providerLabel = PROVIDER_LABELS[provider];

  const disconnect = async (password?: string) => {
    try {
      await mutateAsync({ provider, password });
      onClose();
    } catch {
      // Surfaced below via unlinkAccount.error.
    }
  };

  const onSubmit = form.handleSubmit((values) => disconnect(values.password));

  return (
    <Modal
      open
      onClose={onClose}
      title={`Disconnect ${providerLabel}`}
      ariaLabel={`Disconnect ${providerLabel}`}
    >
      {isSoleAuthMethod ? (
        <div>
          <FormBanner tone="neutral">
            {providerLabel} is currently your only way to sign in. Set a password or connect another
            provider before disconnecting it.
          </FormBanner>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : requiresPassword ? (
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate>
            <p className="text-sm text-muted-foreground">
              Enter your password to confirm disconnecting {providerLabel}.
            </p>

            {isError && <FormBanner className="mt-4">{getAuthErrorMessage(error.code)}</FormBanner>}

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

            <div className="mt-6 flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {showPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground">
            Disconnect {providerLabel} from your account?
          </p>

          {isError && <FormBanner className="mt-4">{getAuthErrorMessage(error.code)}</FormBanner>}

          <div className="mt-6 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => disconnect()} disabled={isPending}>
              {showPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
