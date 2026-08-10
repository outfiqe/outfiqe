import { RotateCcw, Truck } from "lucide-react";

// Mock delivery fee — no shipping/rates API exists yet, and free delivery isn't offered yet
// either, so this is a flat fee with no threshold logic for now.
const FLAT_SHIPPING_FEE = 150;

export function ShippingInfo() {
  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-2.5">
        <Truck className="size-4 shrink-0 text-foreground" />
        <span>
          <span className="font-semibold text-foreground">Rs. {FLAT_SHIPPING_FEE}</span> delivery in
          Kathmandu · 2–3 days
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <RotateCcw className="size-4 shrink-0 text-foreground" />
        <span>Returns within 7 days if unworn</span>
      </div>
    </div>
  );
}
