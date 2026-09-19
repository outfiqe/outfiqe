export const POST_LAYOUT_VALUES = ["PORTRAIT", "SQUARE", "TALL"] as const;

export type PostLayout = (typeof POST_LAYOUT_VALUES)[number];

export const POST_LAYOUT = {
  PORTRAIT: "PORTRAIT",
  SQUARE: "SQUARE",
  TALL: "TALL",
} as const satisfies Record<string, PostLayout>;

export const POST_LAYOUT_ASPECT: Record<PostLayout, number> = {
  PORTRAIT: 4 / 5,
  SQUARE: 1,
  TALL: 9 / 16,
};

export const POST_LAYOUT_LABEL: Record<PostLayout, string> = {
  PORTRAIT: "Portrait",
  SQUARE: "Square",
  TALL: "Tall",
};
