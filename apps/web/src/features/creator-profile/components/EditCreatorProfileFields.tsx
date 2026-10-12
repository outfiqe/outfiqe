"use client";

import { AvatarUploader, Input } from "@outfiqe/design-system";
import type { ReactNode } from "react";

import { uploadImagesThroughPipeline, uploadsApi } from "@/shared/api/uploadsApi";
import { cn } from "@/shared/lib/cn";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { toUploadableImage } from "@/shared/lib/heicImage";

import type { CreatorProfileDraftFields } from "../types/creatorProfileDraft";

const MIN_HEIGHT_CM = 90;
const MAX_HEIGHT_CM = 251;

type EditCreatorProfileFieldsProps = CreatorProfileDraftFields & {
  avatarFallback: ReactNode;
};

export const EditCreatorProfileFields = ({
  avatarFallback,
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
}: EditCreatorProfileFieldsProps) => (
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
        htmlFor="creator-profile-edit-name"
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        Display name
      </label>
      <Input
        id="creator-profile-edit-name"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
      />
    </div>
    <div>
      <label
        htmlFor="creator-profile-edit-handle"
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        Username
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">
          @
        </span>
        <Input
          id="creator-profile-edit-handle"
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
    <div>
      <label
        htmlFor="creator-profile-edit-height"
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        Height (cm)
      </label>
      <Input
        id="creator-profile-edit-height"
        type="number"
        min={MIN_HEIGHT_CM}
        max={MAX_HEIGHT_CM}
        value={draftHeightCm ?? ""}
        onChange={(event) =>
          setDraftHeightCm(event.target.value ? Number(event.target.value) : null)
        }
      />
    </div>
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        className="size-4 rounded border-border"
        checked={draftShowHeight}
        onChange={(event) => setDraftShowHeight(event.target.checked)}
      />
      Show height on my profile
    </label>
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        className="size-4 rounded border-border"
        checked={draftHideFromLeaderboards}
        onChange={(event) => setDraftHideFromLeaderboards(event.target.checked)}
      />
      Hide me from leaderboards
    </label>
  </div>
);
