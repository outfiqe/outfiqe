"use client";

import {
  AvatarUploader,
  Badge,
  BannerUploader,
  Button,
  Input,
  Modal,
  toast,
} from "@outfiqe/design-system";
import { AtSign, Mail, Phone, User } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProfile } from "../api/brandDashboardSchemas";
import { useUpdateBrandProfile } from "../hooks/useUpdateBrandProfile";

type EditableFields = {
  contactName: string;
  phone: string;
  instagram: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

export const BrandProfileView = ({ profile }: { profile: BrandProfile }) => {
  const updateProfile = useUpdateBrandProfile();
  const { updateUser } = useAuth();
  const { brand } = profile;

  const [fields, setFields] = useState<EditableFields>({
    contactName: brand.contactName,
    phone: brand.phone,
    instagram: brand.instagram,
    avatarUrl: brand.avatarUrl,
    bannerUrl: brand.bannerUrl,
  });
  const [draft, setDraft] = useState<EditableFields>(fields);
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = () => {
    setDraft(fields);
    setEditOpen(true);
  };

  const save = () => {
    updateProfile.mutate(draft, {
      onSuccess: (updated) => {
        setFields({
          contactName: updated.brand.contactName,
          phone: updated.brand.phone,
          instagram: updated.brand.instagram,
          avatarUrl: updated.brand.avatarUrl,
          bannerUrl: updated.brand.bannerUrl,
        });
        updateUser({ avatarUrl: updated.brand.avatarUrl });
        setEditOpen(false);
        toast.success("Profile updated");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  const initialsBadge = (
    <span
      aria-hidden
      className="flex size-full items-center justify-center text-lg font-bold text-white"
      style={{ backgroundColor: getAvatarColor(brand.id) }}
    >
      {initialsFor(brand.name)}
    </span>
  );

  const { bannerUrl, avatarUrl, contactName, phone, instagram } = fields;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {bannerUrl && (
          <div
            className="h-28 w-full bg-cover bg-center sm:h-36"
            style={{ backgroundImage: `url(${bannerUrl})` }}
          />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "size-14 shrink-0 overflow-hidden rounded-full bg-cover bg-center",
                  bannerUrl && "-mt-10 ring-4 ring-card",
                )}
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
              >
                {!avatarUrl && initialsBadge}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{brand.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {brand.madeInNepal && <Badge>Made in Nepal</Badge>}
              <Button variant="outline" size="sm" onClick={openEdit}>
                Edit profile
              </Button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="mt-0.5 text-foreground">{contactName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="mt-0.5 text-foreground">{brand.email}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 text-foreground">{phone}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <AtSign className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Instagram</dt>
                <dd className="mt-0.5 text-foreground">{instagram}</dd>
              </div>
            </div>
          </dl>
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">Banner</label>
            <BannerUploader
              value={draft.bannerUrl}
              onChange={(bannerUrl) => setDraft({ ...draft, bannerUrl })}
              onUpload={uploadsApi.upload}
              describeUploadError={getErrorMessage}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Logo</label>
            <AvatarUploader
              value={draft.avatarUrl}
              onChange={(avatarUrl) => setDraft({ ...draft, avatarUrl })}
              onUpload={uploadsApi.upload}
              fallback={initialsBadge}
              describeUploadError={getErrorMessage}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Contact name</label>
            <Input
              value={draft.contactName}
              onChange={(event) => setDraft({ ...draft, contactName: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
            <Input
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Instagram</label>
            <Input
              value={draft.instagram}
              onChange={(event) => setDraft({ ...draft, instagram: event.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Brand name and origin are verified fields — reach out to support to change those.
          </p>
        </div>
      </Modal>
    </div>
  );
};
