"use client";

type CreatorProfileStatsProps = {
  postsCount: number;
  followerCount: number;
  followingCount: number;
  taggedPiecesCount: number;
  openFollowersModal: () => void;
  openFollowingModal: () => void;
};

export const CreatorProfileStats = ({
  postsCount,
  followerCount,
  followingCount,
  taggedPiecesCount,
  openFollowersModal,
  openFollowingModal,
}: CreatorProfileStatsProps) => (
  <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:flex sm:gap-6">
    <div>
      <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
        {postsCount}
      </p>
      <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">Drops</p>
    </div>
    <button
      type="button"
      onClick={openFollowersModal}
      disabled={followerCount === 0}
      className="cursor-pointer text-left disabled:cursor-not-allowed"
    >
      <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
        {followerCount.toLocaleString()}
      </p>
      <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">Followers</p>
    </button>
    <button
      type="button"
      onClick={openFollowingModal}
      disabled={followingCount === 0}
      className="cursor-pointer text-left disabled:cursor-not-allowed"
    >
      <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
        {followingCount.toLocaleString()}
      </p>
      <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">Following</p>
    </button>
    <div>
      <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
        {taggedPiecesCount}
      </p>
      <p className="text-[11px] leading-tight text-muted-foreground sm:text-[11.5px]">
        Tagged pieces
      </p>
    </div>
  </div>
);
