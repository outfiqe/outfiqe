import type { FeedCandidateSnapshot } from "../creator-look.types.js";

export const isEmptySnapshot = (snapshot: FeedCandidateSnapshot): boolean =>
  snapshot.ids.length === 0;

export const interleaveFollowedLooks = (
  discoveryIds: string[],
  followedIds: string[],
  slotInterval: number,
): string[] => {
  const discoverySet = new Set(discoveryIds);
  const freshFollowedIds = followedIds.filter((id) => !discoverySet.has(id));
  if (freshFollowedIds.length === 0) return discoveryIds;

  const merged: string[] = [];
  let nextFollowedIndex = 0;
  discoveryIds.forEach((id, index) => {
    merged.push(id);
    const reachedSlot = (index + 1) % slotInterval === 0;
    const [nextFollowedId] = freshFollowedIds.slice(nextFollowedIndex, nextFollowedIndex + 1);
    if (reachedSlot && nextFollowedId) {
      merged.push(nextFollowedId);
      nextFollowedIndex += 1;
    }
  });
  merged.push(...freshFollowedIds.slice(nextFollowedIndex));
  return merged;
};
