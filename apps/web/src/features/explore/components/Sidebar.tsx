"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useSuggestedCreators } from "../hooks/useSuggestedCreators";
import { useTrendingTags } from "../hooks/useTrendingTags";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";

interface SidebarProps {
  onTagClick: (tag: string) => void;
}

export function Sidebar({ onTagClick }: SidebarProps) {
  return (
    <aside className="sticky top-[76px] hidden h-fit flex-col gap-4 lg:flex">
      <SuggestedCreators />
      <TrendingTags onTagClick={onTagClick} />
    </aside>
  );
}

function SuggestedCreators() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: creators } = useSuggestedCreators();
  const followMutation = useFollowCreator();

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
        Creators to follow
      </h4>

      {!isAuthenticated && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/explore")}
            className="font-semibold text-primary-strong"
          >
            Sign in
          </button>{" "}
          to see who to follow.
        </p>
      )}

      {isAuthenticated && creators?.length === 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">No suggestions right now.</p>
      )}

      <div className="mt-3 flex flex-col">
        {creators?.map((creator) => (
          <div
            key={creator.id}
            className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0"
          >
            <Link href={`/creator/${creator.handle}`} className="shrink-0">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: getAvatarColor(creator.id) }}
              >
                {initialsFor(creator.name)}
              </span>
            </Link>
            <Link href={`/creator/${creator.handle}`} className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-medium text-foreground">{creator.name}</p>
              <p className="text-[11.5px] text-muted-foreground">
                {creator.followerCount.toLocaleString()} followers
              </p>
            </Link>
            <button
              type="button"
              onClick={() => followMutation.mutate({ creatorId: creator.id, following: false })}
              className="ml-auto shrink-0 rounded-full border border-foreground px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingTags({ onTagClick }: { onTagClick: (tag: string) => void }) {
  const { data: tags } = useTrendingTags();
  if (!tags || tags.length === 0) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
        Trending tags
      </h4>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((entry) => (
          <button
            key={entry.tag}
            type="button"
            onClick={() => onTagClick(entry.tag)}
            className={cn(
              "rounded-full bg-muted px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            #{entry.tag}
          </button>
        ))}
      </div>
    </div>
  );
}
