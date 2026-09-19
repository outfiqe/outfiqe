import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";

import type { AdminLook } from "./schemas";

type PostGridCardProps = {
  look: AdminLook;
  onClick: () => void;
};

export const PostGridCard = ({ look, onClick }: PostGridCardProps) => {
  const { imageUrl, layout, caption, creator } = look;

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        aria-label={caption ?? `Post by @${creator.handle}`}
        className="relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-muted bg-cover bg-center transition-colors hover:border-foreground/30"
        style={{
          aspectRatio: String(POST_LAYOUT_ASPECT[layout]),
          backgroundImage: `url(${imageUrl})`,
        }}
      >
        {creator.contentFlagCount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">
            {creator.contentFlagCount}
          </span>
        )}
      </button>

      <p className="mt-2 truncate text-xs font-medium text-foreground">@{creator.handle}</p>
      <p className="line-clamp-2 min-h-[2.25rem] text-[12.5px] leading-snug text-muted-foreground">
        {caption}
      </p>
    </div>
  );
};
