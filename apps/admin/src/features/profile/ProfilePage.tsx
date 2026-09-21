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

import { ImageUpload } from "@/components/ImageUpload";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthContext";
import { getErrorMessage } from "@/lib/errorMessages";

import { ChangePasswordCard } from "./ChangePasswordCard";
import { profileFormSchema, type ProfileFormValues } from "./profileForms.schema";

const PROFILE_UPDATED_MESSAGE = "Profile updated.";

export const ProfilePage = () => {
  const { state, updateUser } = useAuth();
  const user = state.status === "signed-in" ? state.user : null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user?.name ?? "", avatarUrl: user?.avatarUrl ?? null },
    mode: "onTouched",
  });

  const update = useMutation({
    mutationFn: (values: ProfileFormValues) => authApi.updateProfile(values),
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success(PROFILE_UPDATED_MESSAGE);
    },
  });

  const submitProfile = form.handleSubmit((values) => update.mutate(values));

  if (!user) return null;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-foreground">Edit profile</h1>

      <Form {...form}>
        <form
          onSubmit={submitProfile}
          noValidate
          className="mt-5 space-y-5 rounded-xl border border-border bg-card p-5"
        >
          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">Avatar</span>
                <ImageUpload value={field.value} onChange={field.onChange} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="text-xs text-muted-foreground">
              Email
            </label>
            <Input id="profile-email" value={user.email} disabled />
          </div>

          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}

          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>

      <ChangePasswordCard />
    </div>
  );
};
