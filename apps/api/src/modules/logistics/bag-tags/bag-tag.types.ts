export type BagTagBatchSummary = {
  id: string;
  hubId: string;
  hubName: string;
  tagCount: number;
  usedTagCount: number;
  createdAt: string;
};

export type BagTagBatchSheet = BagTagBatchSummary & {
  tags: { code: string; isUsed: boolean }[];
};
