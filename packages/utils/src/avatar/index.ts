const AVATAR_PALETTE = [
  "#8a5a3c",
  "#4a6272",
  "#6b6357",
  "#7a5c3c",
  "#5c4a62",
  "#3a4249",
  "#6d3a24",
  "#4a5a4a",
];

export const getAvatarColor = (id: string): string => {
  const charCodeSum = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[charCodeSum % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]!;
};

export const initialsFor = (name: string): string => {
  return name.trim().slice(0, 1).toUpperCase();
};
