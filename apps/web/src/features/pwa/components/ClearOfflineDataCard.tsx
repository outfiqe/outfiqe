"use client";

import { Button, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { isPwaEnabled } from "../constants/pwaFeatureFlag";
import { clearAllOfflineData } from "../utils/clearOfflineData";

export const ClearOfflineDataCard = () => {
  const [isClearing, setIsClearing] = useState(false);

  if (!isPwaEnabled) return null;

  const clearOfflineData = async () => {
    setIsClearing(true);
    try {
      await clearAllOfflineData();
      toast.success("Offline data cleared");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Offline data</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Outfiqe saves pages and photos on this device so it keeps working with no connection.
        Clearing it frees up space and starts fresh the next time you&apos;re online.
      </p>
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => void clearOfflineData()}
          disabled={isClearing}
        >
          {isClearing ? "Clearing…" : "Clear offline data"}
        </Button>
      </div>
    </div>
  );
};
