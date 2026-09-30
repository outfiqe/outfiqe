import { isOutfitSlotIcon, type OutfitSlotIcon as OutfitSlotIconKey } from "@outfiqe/utils";
import { Footprints, Gem, Handbag, type LucideProps, Shirt, Sparkles, Watch } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "./cn";

type LineIconProps = SVGProps<SVGSVGElement>;

const lineIconDefaults: LineIconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const TrousersIcon = (props: LineIconProps) => (
  <svg {...lineIconDefaults} {...props}>
    <path d="M7 3h10l1 18h-4l-2-11-2 11H6z" />
    <path d="M7 7h10" />
  </svg>
);

const DressIcon = (props: LineIconProps) => (
  <svg {...lineIconDefaults} {...props}>
    <path d="M9 3h6l-1 5 5 13H5l5-13z" />
    <path d="M10 8h4" />
  </svg>
);

const JacketIcon = (props: LineIconProps) => (
  <svg {...lineIconDefaults} {...props}>
    <path d="m8 3-4 3v15h5V10" />
    <path d="m16 3 4 3v15h-5V10" />
    <path d="m8 3 4 5 4-5" />
    <path d="M12 8v13" />
  </svg>
);

const HatIcon = (props: LineIconProps) => (
  <svg {...lineIconDefaults} {...props}>
    <path d="M2 18h20" />
    <path d="M5 18c0-7 3-11 7-11s7 4 7 11" />
    <path d="M7 14h10" />
  </svg>
);

const OUTFIT_SLOT_ICON_COMPONENTS: Record<
  OutfitSlotIconKey,
  ComponentType<LineIconProps> | ComponentType<LucideProps>
> = {
  shirt: Shirt,
  trousers: TrousersIcon,
  dress: DressIcon,
  footwear: Footprints,
  accessory: Watch,
  bag: Handbag,
  jewellery: Gem,
  hat: HatIcon,
  jacket: JacketIcon,
  sparkles: Sparkles,
};

export const OUTFIT_SLOT_ICON_LABELS: Record<OutfitSlotIconKey, string> = {
  shirt: "Shirt",
  trousers: "Trousers",
  dress: "Dress",
  footwear: "Footwear",
  accessory: "Watch",
  bag: "Bag",
  jewellery: "Jewellery",
  hat: "Hat",
  jacket: "Jacket",
  sparkles: "Sparkles",
};

const FALLBACK_ICON: OutfitSlotIconKey = "sparkles";

export type OutfitSlotIconProps = {
  icon: string;
  label?: string;
  className?: string;
};

export const OutfitSlotIcon = ({ icon, label, className }: OutfitSlotIconProps) => {
  const IconComponent = OUTFIT_SLOT_ICON_COMPONENTS[isOutfitSlotIcon(icon) ? icon : FALLBACK_ICON];
  const accessibilityProps = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true, focusable: false };

  return <IconComponent className={cn("size-5 shrink-0", className)} {...accessibilityProps} />;
};
