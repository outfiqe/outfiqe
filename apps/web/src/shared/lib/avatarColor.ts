// Hashes an id into a flat palette color, keeping avatars consistent across renders
// without storing a color anywhere.
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

export function getAvatarColor(id: string): string {
  const charCodeSum = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[charCodeSum % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]!;
}

export function initialsFor(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}
