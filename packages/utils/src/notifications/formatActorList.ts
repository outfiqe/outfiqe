type NamedActor = { name: string };

const otherCountLabel = (othersCount: number): string =>
  othersCount === 1 ? "1 other" : `${othersCount} others`;

/**
 * Pluralizes a grouped notification's actor list off `actorCount`, the
 * group's true total — never `recentActors.length`, which is capped at 3
 * (see the API's notifications/README.md). "Jane" -> "Jane and John" ->
 * "Jane, John and 3 others".
 */
export const formatActorList = (recentActors: NamedActor[], actorCount: number): string => {
  const firstName = recentActors[0]?.name ?? "Someone";
  const secondName = recentActors[1]?.name;

  if (actorCount <= 1) return firstName;
  if (!secondName) return `${firstName} and ${otherCountLabel(actorCount - 1)}`;
  if (actorCount === 2) return `${firstName} and ${secondName}`;

  return `${firstName}, ${secondName} and ${otherCountLabel(actorCount - 2)}`;
};
