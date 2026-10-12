"use client";

import { toast } from "@outfiqe/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useUpdateCreatorProfile } from "@/features/creator-dashboard/hooks/useUpdateCreatorProfile";
import { useHandleAvailability } from "@/features/users/hooks/useHandleAvailability";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { CreatorProfile } from "../api/creatorProfileSchemas";
import type { CreatorProfileDraftFields } from "../types/creatorProfileDraft";

export const useEditableCreatorProfile = (creator: CreatorProfile) => {
  const router = useRouter();
  const { updateUser } = useAuth();
  const updateProfile = useUpdateCreatorProfile();

  const [name, setName] = useState(creator.name);
  const [handle, setHandle] = useState(creator.handle);
  const [avatarUrl, setAvatarUrl] = useState(creator.avatarUrl);
  const [heightCm, setHeightCm] = useState(creator.heightCm);
  const [showHeight, setShowHeight] = useState(creator.showHeight);
  const [hideFromLeaderboards, setHideFromLeaderboards] = useState(creator.hideFromLeaderboards);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftHandle, setDraftHandle] = useState(handle);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl);
  const [draftAvatarImageAssetId, setDraftAvatarImageAssetId] = useState<string | null>(null);
  const [draftHeightCm, setDraftHeightCm] = useState(heightCm);
  const [draftShowHeight, setDraftShowHeight] = useState(showHeight);
  const [draftHideFromLeaderboards, setDraftHideFromLeaderboards] = useState(hideFromLeaderboards);
  const handleAvailability = useHandleAvailability(draftHandle, handle);

  const openEdit = () => {
    setDraftName(name);
    setDraftHandle(handle);
    setDraftAvatarUrl(avatarUrl);
    setDraftAvatarImageAssetId(null);
    setDraftHeightCm(heightCm);
    setDraftShowHeight(showHeight);
    setDraftHideFromLeaderboards(hideFromLeaderboards);
    setEditOpen(true);
  };

  const handleChanged = draftHandle.trim().toLowerCase() !== handle;
  const canSaveHandle = !handleChanged || handleAvailability === "available";

  const saveEdit = () => {
    const trimmed = draftName.trim();
    if (!trimmed || !canSaveHandle) return;

    const avatarChanged = draftAvatarUrl !== avatarUrl;

    updateProfile.mutate(
      {
        name: trimmed,
        heightCm: draftHeightCm,
        showHeight: draftShowHeight,
        hideFromLeaderboards: draftHideFromLeaderboards,
        ...(handleChanged ? { handle: draftHandle.trim().toLowerCase() } : {}),
        ...(avatarChanged
          ? { avatarUrl: draftAvatarUrl, avatarImageAssetId: draftAvatarImageAssetId }
          : {}),
      },
      {
        onSuccess: (updated) => {
          setName(updated.name);
          setHandle(updated.handle);
          setAvatarUrl(updated.avatarUrl);
          setHeightCm(updated.heightCm);
          setShowHeight(updated.showHeight);
          setHideFromLeaderboards(updated.hideFromLeaderboards);
          updateUser({ name: updated.name, handle: updated.handle, avatarUrl: updated.avatarUrl });
          setEditOpen(false);
          toast.success("Profile updated");
          if (window.location.pathname.startsWith("/creator/")) {
            router.replace(`/creator/${updated.handle}`);
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const draftFields: CreatorProfileDraftFields = {
    handleAvailability,
    draftAvatarUrl,
    setDraftAvatarUrl,
    setDraftAvatarImageAssetId,
    draftName,
    setDraftName,
    draftHandle,
    setDraftHandle,
    draftHeightCm,
    setDraftHeightCm,
    draftShowHeight,
    setDraftShowHeight,
    draftHideFromLeaderboards,
    setDraftHideFromLeaderboards,
  };

  return {
    name,
    handle,
    avatarUrl,
    heightCm,
    editOpen,
    setEditOpen,
    openEdit,
    saveEdit,
    canSaveHandle,
    isSavingProfile: updateProfile.isPending,
    draftFields,
  };
};
