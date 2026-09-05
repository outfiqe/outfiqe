"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreatorStatus } from "@/features/auth/types";
import { ApplyAsCreatorButton } from "@/features/creator-dashboard/components/ApplyAsCreatorButton";
import { PostModal } from "@/features/creator-dashboard/components/PostModal";
import { useSharedPhoto } from "@/features/pwa";

type ShareTargetComposerProps = {
  creatorStatus: CreatorStatus;
};

const InfoMessage = ({ title, description }: { title: string; description: string }) => (
  <div className="mx-auto max-w-md px-4 py-10 text-center">
    <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>
);

export const ShareTargetComposer = ({ creatorStatus }: ShareTargetComposerProps) => {
  const router = useRouter();
  const { data: sharedPhoto, isLoading } = useSharedPhoto();
  const [isOpen, setIsOpen] = useState(true);

  const close = () => {
    setIsOpen(false);
    router.replace("/explore");
  };

  if (isLoading) return null;

  if (creatorStatus === CreatorStatus.PENDING) {
    return (
      <InfoMessage
        title="Application under review"
        description="We're looking at your creator application. We'll email you once it's reviewed."
      />
    );
  }

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="font-display text-lg font-bold text-foreground">Become a creator to post</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apply to post your fits, tag the pieces you&apos;re wearing, and get credit when someone
          buys through your post.
        </p>
        <div className="mt-4 flex justify-center">
          <ApplyAsCreatorButton />
        </div>
      </div>
    );
  }

  if (!sharedPhoto) {
    return (
      <InfoMessage
        title="Nothing was shared"
        description="Share a photo into Outfiqe from another app to start a new look here."
      />
    );
  }

  return <PostModal open={isOpen} onClose={close} initialPhotoFile={sharedPhoto} />;
};
