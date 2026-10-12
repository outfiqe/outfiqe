export const BOARD_TAB = {
  OUTFIT: "outfit",
  PEOPLE: "people",
  PHOTOS: "photos",
  BUY_AND_DROP: "buy-and-drop",
} as const;

export const BOARD_TABS_WITHOUT_PHOTOS = [
  BOARD_TAB.OUTFIT,
  BOARD_TAB.PEOPLE,
  BOARD_TAB.BUY_AND_DROP,
];
export const BOARD_TABS_WITH_PHOTOS = [...BOARD_TABS_WITHOUT_PHOTOS, BOARD_TAB.PHOTOS];
