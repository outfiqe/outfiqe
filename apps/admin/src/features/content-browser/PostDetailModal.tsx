import { Badge, Button, Modal } from "@outfiqe/design-system";

import { PostCommentsPanel } from "./PostCommentsPanel";
import type { AdminLook } from "./schemas";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

type PostDetailModalProps = {
  look: AdminLook;
  onClose: () => void;
  onDeletePost: () => void;
  onDeleteComment: (commentId: string, preview: string) => void;
  deletingCommentId: string | null;
};

const formatCreatedAt = (createdAt: string): string =>
  new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const PostDetailModal = ({
  look,
  onClose,
  onDeletePost,
  onDeleteComment,
  deletingCommentId,
}: PostDetailModalProps) => {
  const { id, imageUrl, caption, creator, likeCount, commentCount, saveCount, createdAt } = look;

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={`Post by @${creator.handle}`}
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[85vh] sm:max-w-4xl sm:rounded-2xl"
    >
      <div className="-mx-6 -my-5 flex flex-col sm:h-[32rem] sm:flex-row">
        <div
          className="aspect-[4/5] shrink-0 border-b border-border bg-muted bg-cover bg-center sm:aspect-auto sm:h-full sm:w-95 sm:border-b-0 sm:border-r"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />

        <div className="flex min-h-0 flex-1 flex-col sm:overflow-y-auto">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">@{creator.handle}</p>
              {creator.contentFlagCount > 0 && (
                <Badge showDot={false} tone="negative">
                  {creator.contentFlagCount} prior removal
                  {creator.contentFlagCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {likeCount} likes &middot; {commentCount} comments &middot; {saveCount} saves &middot;{" "}
              {formatCreatedAt(createdAt)} &middot;{" "}
              <a
                href={`${WEB_URL}/creator/${creator.handle}?look=${id}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                View post
              </a>
            </p>
          </div>

          <div className="px-4 py-3.5">
            {caption && <p className="text-[13.5px] leading-relaxed text-foreground">{caption}</p>}

            <Button
              variant="outline"
              onClick={onDeletePost}
              className="mt-3 border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              Delete post
            </Button>

            <PostCommentsPanel
              lookId={id}
              onDeleteComment={onDeleteComment}
              deletingCommentId={deletingCommentId}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
