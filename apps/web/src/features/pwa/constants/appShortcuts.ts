import type { MetadataRoute } from "next";

type ManifestShortcut = NonNullable<MetadataRoute.Manifest["shortcuts"]>[number];

export const appShortcuts: ManifestShortcut[] = [
  {
    name: "Shop all",
    short_name: "Shop",
    url: "/shop",
    description: "Browse clothing from every brand on Outfiqe",
  },
  {
    name: "Explore looks",
    short_name: "Explore",
    url: "/explore",
    description: "See what creators are wearing right now",
  },
  {
    name: "Search",
    short_name: "Search",
    url: "/search",
    description: "Find a product, brand, or creator",
  },
  {
    name: "Wishlist",
    short_name: "Wishlist",
    url: "/wishlist",
    description: "Everything you saved for later",
  },
];
