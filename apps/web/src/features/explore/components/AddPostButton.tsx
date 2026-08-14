"use client";

import { Modal } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { CreatorStatus } from "@/features/auth/types";
// Deep-imported rather than via the creator-dashboard barrel: that barrel also re-exports a
// "server-only" server-fetch helper (getCreatorProfileServer), which this "use client" component
// can't pull in without breaking the client bundle.
import { ApplyAsCreatorButton } from "@/features/creator-dashboard/components/ApplyAsCreatorButton";
import { PostModal } from "@/features/creator-dashboard/components/PostModal";

type ComposeTarget = "look" | "become_creator" | null;

// Persistent compose entry point for the explore feed (a floating action button rather than a
// header composer): a FAB stays reachable while the feed scrolls, where a top-of-feed composer
// would not. Clicking it opens the same PostModal the creator dashboard uses, so posting a look
// doesn't require leaving the feed.
export const AddPostButton = () => {
  const router = useRouter();
  const { isAuthenticated, state } = useAuth();
  const [target, setTarget] = useState<ComposeTarget>(null);

  const creatorStatus = state.user?.creatorStatus ?? CreatorStatus.NONE;
  const isApprovedCreator = creatorStatus === CreatorStatus.APPROVED;
  const close = () => setTarget(null);

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/explore");
      return;
    }
    setTarget(isApprovedCreator ? "look" : "become_creator");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Add a post"
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8"
      >
        <Plus className="size-6" />
      </button>

      {isApprovedCreator && <PostModal open={target === "look"} onClose={close} />}

      {target === "become_creator" && (
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
