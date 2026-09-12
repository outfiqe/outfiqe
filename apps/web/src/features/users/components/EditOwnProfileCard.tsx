"use client";

import { AvatarUploader, Button, Input, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { uploadImagesThroughPipeline, uploadsApi } from "@/shared/api/uploadsApi";
import { AppImage } from "@/shared/components/AppImage";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { toUploadableImage } from "@/shared/lib/heicImage";

import { useHandleAvailability } from "../hooks/useHandleAvailability";
import { useUpdateOwnProfile } from "../hooks/useUpdateOwnProfile";

type EditOwnProfileCardProps = {
  userId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export const EditOwnProfileCard = ({
  userId,
  name: initialName,
  handle: initialHandle,
  avatarUrl: initialAvatarUrl,
}: EditOwnProfileCardProps) => {
  const { updateUser } = useAuth();
  const updateProfile = useUpdateOwnProfile();

  const [name, setName] = useState(initialName);
  const [handle, setHandle] = useState(initialHandle);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftHandle, setDraftHandle] = useState(handle);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl);
  const [draftAvatarImageAssetId, setDraftAvatarImageAssetId] = useState<string | null>(null);

  const handleAvailability = useHandleAvailability(draftHandle, handle);
  const handleChanged = draftHandle.trim().toLowerCase() !== handle;
  const canSaveHandle = !handleChanged || handleAvailability === "available";

  const openEdit = () => {
    setDraftName(name);
    setDraftHandle(handle);
    setDraftAvatarUrl(avatarUrl);
    setDraftAvatarImageAssetId(null);
    setEditOpen(true);
  };

  const saveEdit = () => {
    const trimmed = draftName.trim();
    if (!trimmed || !canSaveHandle) return;

    const avatarChanged = draftAvatarUrl !== avatarUrl;

    updateProfile.mutate(
      {
        name: trimmed,
        ...(handleChanged ? { handle: draftHandle.trim().toLowerCase() } : {}),
        ...(avatarChanged
          ? { avatarUrl: draftAvatarUrl, avatarImageAssetId: draftAvatarImageAssetId }
          : {}),
      },
      {
        onSuccess: () => {
          const updatedHandle = handleChanged ? draftHandle.trim().toLowerCase() : handle;
          setName(trimmed);
          setHandle(updatedHandle);
          setAvatarUrl(draftAvatarUrl);
          updateUser({ name: trimmed, handle: updatedHandle, avatarUrl: draftAvatarUrl });
          setEditOpen(false);
          toast.success("Profile updated");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const avatarFallback = (
    <span
      aria-hidden
      className="flex size-full items-center justify-center text-lg font-bold text-white"
      style={{ backgroundColor: getAvatarColor(userId) }}
    >
      {initialsFor(name)}
    </span>
  );

  return (
    <div className="mb-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-full">
        {avatarUrl ? <AppImage src={avatarUrl} alt="" fill sizes="56px" /> : avatarFallback}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-[13px] text-muted-foreground">@{handle}</p>
      </div>
      <Button variant="outline" size="sm" onClick={openEdit} className="shrink-0">
        Edit profile
      </Button>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={updateProfile.isPending || !canSaveHandle}>
              {updateProfile.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Photo</label>
            <AvatarUploader
              value={draftAvatarUrl}
              onChange={setDraftAvatarUrl}
              onUpload={uploadsApi.upload}
              onUploadWithAsset={uploadImagesThroughPipeline}
              onAssetIdChange={setDraftAvatarImageAssetId}
              fallback={avatarFallback}
              describeUploadError={getErrorMessage}
              transformFile={toUploadableImage}
            />
          </div>
          <div>
            <label
              htmlFor="own-profile-edit-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Display name
            </label>
            <Input
              id="own-profile-edit-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="own-profile-edit-handle"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="own-profile-edit-handle"
                value={draftHandle}
                onChange={(event) => setDraftHandle(event.target.value)}
                aria-invalid={handleAvailability === "taken" || handleAvailability === "invalid"}
                className="pl-7"
              />
            </div>
            {handleAvailability !== "idle" && (
              <p
                className={cn(
                  "mt-1.5 text-[13px]",
                  handleAvailability === "available" && "text-success",
                  (handleAvailability === "taken" || handleAvailability === "invalid") &&
                    "text-destructive",
                  handleAvailability === "checking" && "text-muted-foreground",
                )}
              >
                {handleAvailability === "checking" && "Checking availability…"}
                {handleAvailability === "available" && "Username is available"}
                {handleAvailability === "taken" && "That username is already taken"}
                {handleAvailability === "invalid" &&
                  "3-20 characters, start with a letter, lowercase letters/numbers/underscores only"}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
