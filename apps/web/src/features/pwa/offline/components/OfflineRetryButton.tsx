"use client";

import { Button } from "@outfiqe/design-system";

export const OfflineRetryButton = () => (
  <Button className="cursor-pointer" onClick={() => window.location.reload()}>
    Try again
  </Button>
);
