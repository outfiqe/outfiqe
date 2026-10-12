import type { HandleAvailabilityStatus } from "@/features/users/hooks/useHandleAvailability";

export type CreatorProfileDraftFields = {
  handleAvailability: HandleAvailabilityStatus;
  draftAvatarUrl: string | null;
  setDraftAvatarUrl: (avatarUrl: string | null) => void;
  setDraftAvatarImageAssetId: (avatarImageAssetId: string | null) => void;
  draftName: string;
  setDraftName: (name: string) => void;
  draftHandle: string;
  setDraftHandle: (handle: string) => void;
  draftHeightCm: number | null;
  setDraftHeightCm: (heightCm: number | null) => void;
  draftShowHeight: boolean;
  setDraftShowHeight: (showHeight: boolean) => void;
  draftHideFromLeaderboards: boolean;
  setDraftHideFromLeaderboards: (hideFromLeaderboards: boolean) => void;
};
