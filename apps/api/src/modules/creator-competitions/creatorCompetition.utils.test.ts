import { describe, expect, it } from "vitest";

import type { CompetitionForPublicView } from "./creatorCompetition.utils.js";
import { toPublicView } from "./creatorCompetition.utils.js";

const competition: CompetitionForPublicView = {
  id: "competition-1",
  name: "Weekly Sprint",
  category: "MOST_LIKES",
  topN: 3,
  badge: {
    id: "badge-1",
    name: "Style Star",
    icon: "🌟",
    rarity: "RARE",
    designConfig: { shape: "star", primaryColor: "#f97316" },
  },
};

describe("toPublicView", () => {
  it("exposes only the fields a public viewer needs, not admin-only badge internals", () => {
    expect(toPublicView(competition)).toEqual({
      id: "competition-1",
      name: "Weekly Sprint",
      category: "MOST_LIKES",
      topN: 3,
      badge: {
        id: "badge-1",
        name: "Style Star",
        icon: "🌟",
        rarity: "RARE",
        designConfig: { shape: "star", primaryColor: "#f97316" },
      },
    });
  });
});
