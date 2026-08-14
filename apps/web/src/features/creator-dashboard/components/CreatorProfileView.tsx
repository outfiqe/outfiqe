"use client";

import { AvatarUploader, Badge, Button, Input, Modal, toast } from "@outfiqe/design-system";
import { Mail } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { CreatorStatus } from "@/features/auth/types";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { CreatorProfile } from "../api/creatorDashboardSchemas";
import { useMyLooks } from "../hooks/useMyLooks";
import { useUpdateCreatorProfile } from "../hooks/useUpdateCreatorProfile";

const STATUS_LABEL: Record<CreatorStatus, string> = {
  [CreatorStatus.APPROVED]: "Approved creator",
  [CreatorStatus.PENDING]: "Application pending",
  [CreatorStatus.REJECTED]: "Application not approved",
  [CreatorStatus.NONE]: "Not a creator yet",
};

export const CreatorProfileView = ({ profile }: { profile: CreatorProfile }) => {
  const looks = useMyLooks();
  const updateProfile = useUpdateCreatorProfile();
  const { updateUser } = useAuth();
  const { name: initialName, avatarUrl: initialAvatarUrl, userId, email, creatorStatus } = profile;
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl);

  const openEdit = () => {
    setDraftName(name);
    setDraftAvatarUrl(avatarUrl);
    setEditOpen(true);
  };

  const save = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;

    updateProfile.mutate(
      { name: trimmed, avatarUrl: draftAvatarUrl },
      {
        onSuccess: (updated) => {
          setName(updated.name);
          setAvatarUrl(updated.avatarUrl);
          updateUser({ name: updated.name, avatarUrl: updated.avatarUrl });
          setEditOpen(false);
          toast.success("Profile updated");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const initialsBadge = (
    <span
      aria-hidden
      className="flex size-full items-center justify-center text-lg font-bold text-white"
      style={{ backgroundColor: getAvatarColor(userId) }}
    >
      {initialsFor(name)}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="size-14 shrink-0 overflow-hidden rounded-full bg-cover bg-center"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
            >
              {!avatarUrl && initialsBadge}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openEdit}>
            Edit profile
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Badge
            dotClassName={
              creatorStatus === CreatorStatus.APPROVED ? undefined : "bg-muted-foreground"
            }
          >
            {STATUS_LABEL[creatorStatus]}
          </Badge>
          {creatorStatus === CreatorStatus.APPROVED && (
            <span className="text-sm text-muted-foreground">
              {looks.data?.pages.flatMap((page) => page.looks).length ?? 0} looks posted
            </span>
          )}
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={updateProfile.isPending}>
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
              fallback={initialsBadge}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Display name</label>
            <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <Input value={email} disabled />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3.5" />
              Contact support to change your email
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
