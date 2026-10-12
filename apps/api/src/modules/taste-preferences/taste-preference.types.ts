export type TastePreferenceView = {
  categorySlugs: string[] | null;
};

export type CategoryPopularity = {
  slug: string;
  userCount: number;
};
