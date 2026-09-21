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
  toast,
} from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { authApi } from "@/features/auth/api";
import { ApiClientError } from "@/lib/apiClient";

import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
  EMPTY_CHANGE_PASSWORD_FORM,
} from "./profileForms.schema";

const FALLBACK_ERROR = "Something went wrong. Please try again.";
const PASSWORD_UPDATED_MESSAGE = "Password updated. Other devices were signed out.";

const errorMessageFor = (error: unknown): string => {
  if (error instanceof ApiClientError) return error.message;
  return FALLBACK_ERROR;
};

export const ChangePasswordCard = () => {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY_CHANGE_PASSWORD_FORM,
    mode: "onTouched",
  });

  const changePassword = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      form.reset(EMPTY_CHANGE_PASSWORD_FORM);
      toast.success(PASSWORD_UPDATED_MESSAGE);
    },
  });

  const submitPasswordChange = form.handleSubmit((values) => changePassword.mutate(values));

  return (
    <Form {...form}>
      <form
        onSubmit={submitPasswordChange}
        noValidate
        className="mt-5 max-w-lg space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Change password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Changing your password signs out your other devices.
          </p>
        </div>

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">
                Current password
              </FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">
                New password
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
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">
                Confirm new password
              </FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {changePassword.isError && <FormBanner>{errorMessageFor(changePassword.error)}</FormBanner>}

        <Button type="submit" isLoading={changePassword.isPending}>
          Update password
        </Button>
      </form>
    </Form>
  );
};
