export const FEATURE_FLAG_REGISTRY = [
  {
    key: "outfit_builder",
    label: "Outfit Build",
    description:
      "The whole Outfit Build feature: My Builds, boards, build chats and shopping from builds.",
  },
  {
    key: "outfit_photos",
    label: "Build cover photos",
    description: "Lets people add their own cover photos to a build.",
  },
  {
    key: "outfit_try_on",
    label: "Build try-on photos",
    description: "Lets people add photos of someone wearing the outfit.",
  },
  {
    key: "outfit_public_feed",
    label: "Public Builds feed",
    description: "Shows public builds in the Builds tab in Explore and on profiles.",
  },
  {
    key: "size_fit",
    label: "Size charts and fit finder",
    description:
      "Shows brands' size charts on product pages, the Find my size modal and the Find what fits me page.",
  },
  {
    key: "order_logistics",
    label: "Outfiqe delivery (rider, hub, partners)",
    description:
      "New orders from brands with a covered pickup location go through Outfiqe riders, the hub and delivery partners instead of the brand shipping them.",
  },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_REGISTRY)[number]["key"];

export const ORDER_LOGISTICS_FLAG = "order_logistics" satisfies FeatureFlagKey;

const FEATURE_FLAG_KEY_SET: ReadonlySet<string> = new Set(
  FEATURE_FLAG_REGISTRY.map((entry) => entry.key),
);

export const isFeatureFlagKey = (key: string): key is FeatureFlagKey =>
  FEATURE_FLAG_KEY_SET.has(key);

export const FEATURE_FLAG_KEYS: FeatureFlagKey[] = FEATURE_FLAG_REGISTRY.map((entry) => entry.key);
