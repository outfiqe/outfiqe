"use client";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import type { SeenOnCreator } from "../api/productDetailSchemas";

interface TrustLineProps {
  wornByCount: number;
  creators: SeenOnCreator[];
  onClick: () => void;
}

export function TrustLine({ wornByCount, creators, onClick }: TrustLineProps) {
  if (wornByCount === 0) return null;

  const faces = creators.slice(0, 3);

  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 py-3 text-left">
      <div className="flex -space-x-2">
        {faces.map((creator) => (
          <span
            key={creator.creatorId}
            className="flex size-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white"
            style={{ backgroundColor: getAvatarColor(creator.creatorId) }}
          >
            {initialsFor(creator.name)}
          </span>
        ))}
      </div>
      <span className="text-[13.5px] text-muted-foreground">
        Worn by <span className="font-semibold text-foreground">{wornByCount}</span>{" "}
        {wornByCount === 1 ? "creator" : "creators"}
      </span>
    </button>
  );
}
