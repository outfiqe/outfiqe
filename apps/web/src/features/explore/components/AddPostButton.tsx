"use client";

import { Modal } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { CreatorStatus, UserRole } from "@/features/auth/types";
import { ApplyAsCreatorButton } from "@/features/creator-dashboard/components/ApplyAsCreatorButton";
import { PostModal } from "@/features/creator-dashboard/components/PostModal";

import { useExploreAuthGate } from "../hooks/useExploreAuthGate";

const COMPOSE_TARGET = {
  LOOK: "look",
  BECOME_CREATOR: "become_creator",
} as const;

type ComposeTarget = (typeof COMPOSE_TARGET)[keyof typeof COMPOSE_TARGET] | null;

export const AddPostButton = () => {
  const { state } = useAuth();
  const { isAuthenticated, goToSignIn } = useExploreAuthGate();
  const [target, setTarget] = useState<ComposeTarget>(null);

  const creatorStatus = state.user?.creatorStatus ?? CreatorStatus.NONE;
  const isApprovedCreator = creatorStatus === CreatorStatus.APPROVED;
  const isBrandOwner = state.user?.role === UserRole.BRAND_OWNER;
  const close = () => setTarget(null);

  if (isBrandOwner) return null;

  const handleClick = () => {
    if (!isAuthenticated) {
      goToSignIn();
      return;
    }
    setTarget(isApprovedCreator ? COMPOSE_TARGET.LOOK : COMPOSE_TARGET.BECOME_CREATOR);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Add a post"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 hover:bg-[#ff6a1f] active:scale-95 sm:w-auto sm:px-6 lg:bottom-28 lg:right-8"
      >
        <Plus className="size-6 shrink-0" />
        <span className="hidden text-[15px] font-semibold sm:inline">Post</span>
      </button>

      {isApprovedCreator && <PostModal open={target === COMPOSE_TARGET.LOOK} onClose={close} />}

      {target === COMPOSE_TARGET.BECOME_CREATOR && (
        <Modal
          open
          onClose={close}
          title={
            creatorStatus === CreatorStatus.PENDING
              ? "Application under review"
              : "Become a creator"
          }
        >
          <p className="text-sm text-muted-foreground">
            {creatorStatus === CreatorStatus.PENDING
              ? "We're looking at your creator application. We'll email you once it's reviewed."
              : "Apply to post your fits, tag the pieces you're wearing, and get credit when someone buys through your post."}
          </p>
          {creatorStatus !== CreatorStatus.PENDING && (
            <div className="mt-4">
              <ApplyAsCreatorButton />
            </div>
          )}
        </Modal>
      )}
    </>
  );
};
