"use client";

import { Button } from "@outfiqe/design-system";
import { Share2 } from "lucide-react";

type CreatorProfileActionsProps = {
  isOwnProfile: boolean;
  isStaff: boolean;
  isFollowing: boolean;
  isStartingConversation: boolean;
  openEdit: () => void;
  toggleFollow: () => void;
  messageCreator: () => void;
  shareProfile: () => Promise<void>;
};

export const CreatorProfileActions = ({
  isOwnProfile,
  isStaff,
  isFollowing,
  isStartingConversation,
  openEdit,
  toggleFollow,
  messageCreator,
  shareProfile,
}: CreatorProfileActionsProps) => (
  <div className="flex w-full shrink-0 gap-2 sm:w-auto">
    {isOwnProfile ? (
      <Button variant="outline" size="sm" onClick={openEdit} className="flex-1 sm:flex-none">
        Edit profile
      </Button>
    ) : (
      <>
        {!isStaff && (
          <Button
            variant="outline"
            size="sm"
            aria-pressed={isFollowing}
            onClick={toggleFollow}
            className="flex-1 sm:flex-none"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={messageCreator}
          disabled={isStartingConversation}
          className="flex-1 sm:flex-none"
        >
          Message
        </Button>
      </>
    )}
    <Button
      variant="outline"
      size="icon"
      aria-label="Share profile"
      onClick={() => void shareProfile()}
      className="shrink-0"
    >
      <Share2 className="size-[18px]" />
    </Button>
  </div>
);
