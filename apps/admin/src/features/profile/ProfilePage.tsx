import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { ImageUpload } from "@/components/ImageUpload";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthContext";

export const ProfilePage = () => {
  const { state, updateUser } = useAuth();
  const user = state.status === "signed-in" ? state.user : null;

  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: () => authApi.updateProfile({ name, avatarUrl }),
    onSuccess: (updated) => {
      updateUser(updated);
      setError(null);
      setSaved(true);
    },
    onError: (err) => {
      setSaved(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    update.mutate();
  };

  if (!user) return null;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-foreground">Edit profile</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-5 rounded-xl border border-border bg-card p-5"
      >
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Avatar</label>
          <ImageUpload value={avatarUrl} onChange={setAvatarUrl} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="profile-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Email</label>
          <Input value={user.email} disabled />
        </div>

        {error && <FormBanner>{error}</FormBanner>}
        {saved && !error && <p className="text-sm text-primary">Profile updated.</p>}

        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
};
