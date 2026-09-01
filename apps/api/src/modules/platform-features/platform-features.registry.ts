export const PLATFORM_FEATURE_KEYS = [
  "crm.advanced",
  "crm.pipeline",
  "crm.tickets",
  "crm.contacts",
  "gamification",
  "impersonation.allowed",
] as const;

export type PlatformFeatureKey = (typeof PLATFORM_FEATURE_KEYS)[number];

export type FeatureDefinition = {
  key: PlatformFeatureKey;
  label: string;
  description: string;
  registryDefault: boolean;
  planDefaults: Record<string, boolean>;
};

const ALL_PLANS_ON = { trial: true, starter: true, growth: true };

export const PLATFORM_FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    key: "crm.advanced",
    label: "Advanced CRM",
    description: "Partners, Customers, pipeline, activities, tickets and reporting.",
    registryDefault: false,
    planDefaults: { trial: true, starter: true, growth: true },
  },
  {
    key: "crm.pipeline",
    label: "Deal pipeline",
    description: "The Kanban pipeline and deals.",
    registryDefault: true,
    planDefaults: ALL_PLANS_ON,
  },
  {
    key: "crm.tickets",
    label: "Support tickets",
    description: "The support ticket queue.",
    registryDefault: true,
    planDefaults: ALL_PLANS_ON,
  },
  {
    key: "crm.contacts",
    label: "Contacts",
    description: "The manually managed contact list.",
    registryDefault: true,
    planDefaults: ALL_PLANS_ON,
  },
  {
    key: "gamification",
    label: "Gamification",
    description: "XP, levels, badges and leaderboards for this tenant's creators.",
    registryDefault: true,
    planDefaults: ALL_PLANS_ON,
  },
  {
    key: "impersonation.allowed",
    label: "Allow impersonation",
    description: "Whether platform staff may open an impersonation session on this tenant.",
    registryDefault: true,
    planDefaults: ALL_PLANS_ON,
  },
];

const REGISTRY_BY_KEY = new Map(PLATFORM_FEATURE_REGISTRY.map((entry) => [entry.key, entry]));

export const isPlatformFeatureKey = (key: string): key is PlatformFeatureKey =>
  REGISTRY_BY_KEY.has(key as PlatformFeatureKey);

export const planDefaultFor = (key: PlatformFeatureKey, plan: string): boolean => {
  const definition = REGISTRY_BY_KEY.get(key);
  if (!definition) return false;
  return definition.planDefaults[plan] ?? definition.registryDefault;
};
