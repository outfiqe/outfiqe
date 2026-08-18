const HOUR_MS = 60 * 60 * 1000;

export const truncateToHour = (date: Date): Date => {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated;
};

export const ageHoursOf = (bucket: { bucketStart: Date }, now: Date): number =>
  (now.getTime() - bucket.bucketStart.getTime()) / HOUR_MS;

export const decayWeight = (ageHours: number, halfLifeHours: number): number =>
  Math.exp(-ageHours / halfLifeHours);

export const applyDiversity = <T>(
  candidates: T[],
  limit: number,
  maxPerGroup: number,
  groupIdOf: (candidate: T) => string,
): T[] => {
  const groupCounts = new Map<string, number>();
  const picked: T[] = [];
  for (const candidate of candidates) {
    if (picked.length >= limit) break;
    const groupId = groupIdOf(candidate);
    const used = groupCounts.get(groupId) ?? 0;
    if (used >= maxPerGroup) continue;
    picked.push(candidate);
    groupCounts.set(groupId, used + 1);
  }
  return picked;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const weightedShuffle = <T extends { score: number }>(items: T[], rng: () => number): T[] => {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, item) => sum + item.score, 0);
    let remaining = rng() * totalWeight;
    let pickedIndex = pool.length - 1;
    for (const [index, item] of pool.entries()) {
      remaining -= item.score;
      if (remaining <= 0) {
        pickedIndex = index;
        break;
      }
    }
    const [chosen] = pool.splice(pickedIndex, 1);
    if (chosen) picked.push(chosen);
  }
  return picked;
};

export const applyWeightedRotation = <T extends { score: number }>(
  candidates: T[],
  tieBandRatio: number,
  seed: number,
): T[] => {
  const rng = mulberry32(seed);
  const result: T[] = [];
  let index = 0;
  while (index < candidates.length) {
    const bandLeader = candidates[index];
    if (!bandLeader) break;
    const bandThreshold = bandLeader.score * (1 - tieBandRatio);
    let end = index;
    while (end < candidates.length && (candidates[end]?.score ?? -Infinity) >= bandThreshold) {
      end += 1;
    }
    result.push(...weightedShuffle(candidates.slice(index, end), rng));
    index = end;
  }
  return result;
};
