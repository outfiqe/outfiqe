"use client";

import { Button } from "@outfiqe/design-system";

import { useAuth } from "../context/AuthContext";
import { getDefaultRouteForUser } from "../utils/getDefaultRoute";

export const NotAShopperNotice = () => {
  const { state, isBrandOwner } = useAuth();
  const dashboardHref = state.user ? getDefaultRouteForUser(state.user) : "/";

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold text-foreground">
        Not available on this account
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The bag, checkout, and order history are for customer accounts. Your{" "}
        {isBrandOwner ? "brand" : "admin"} account manages products and fulfilment instead.
      </p>
      <Button asChild className="mt-4">
        <a href={dashboardHref}>Go to your dashboard</a>
      </Button>
    </div>
  );
};
