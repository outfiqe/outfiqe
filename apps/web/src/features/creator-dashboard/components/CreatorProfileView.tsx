"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { Badge } from "@/design-system/components/ui/badge";
import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import { Modal } from "@/design-system/components/ui/modal";
import { toast } from "@/design-system/components/ui/toast";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { CreatorStatus } from "@/features/auth/types";
import { useMyLooks } from "../hooks/useMyLooks";
import type { CreatorProfile } from "../api/creatorDashboardSchemas";

const STATUS_LABEL: Record<CreatorStatus, string> = {
  [CreatorStatus.APPROVED]: "Approved creator",
  [CreatorStatus.PENDING]: "Application pending",
  [CreatorStatus.REJECTED]: "Application not approved",
  [CreatorStatus.NONE]: "Not a creator yet",
};

export const CreatorProfileView = ({ profile }: { profile: CreatorProfile }) => {
  const looks = useMyLooks();
  const [name, setName] = useState(profile.name);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);

  const openEdit = () => {
    setDraftName(name);
    setEditOpen(true);
  };

  const save = () => {
    const trimmed = draftName.trim();
    if (trimmed) setName(trimmed);
    setEditOpen(false);
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ backgroundColor: getAvatarColor(profile.userId) }}
            >
              {initialsFor(name)}
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openEdit}>
            Edit profile
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Badge
            dotClassName={
              profile.creatorStatus === CreatorStatus.APPROVED ? undefined : "bg-muted-foreground"
            }
          >
            {STATUS_LABEL[profile.creatorStatus]}
          </Badge>
          {profile.creatorStatus === CreatorStatus.APPROVED && (
            <span className="text-sm text-muted-foreground">
              {looks.data?.length ?? 0} looks posted
            </span>
          )}
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        description="Changes are saved to your session for now."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Display name</label>
            <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <Input value={profile.email} disabled />
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
