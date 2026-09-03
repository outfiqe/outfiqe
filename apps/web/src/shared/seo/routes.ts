export interface MarketingRoute {
  path: string;
  label: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

export const primaryCommerceRoutes: MarketingRoute[] = [
  { path: "/", label: "Home", changeFrequency: "daily", priority: 1 },
  { path: "/shop", label: "Shop all", changeFrequency: "daily", priority: 0.9 },
  { path: "/brands", label: "Brands", changeFrequency: "weekly", priority: 0.8 },
  { path: "/collections", label: "Collections", changeFrequency: "weekly", priority: 0.8 },
  { path: "/explore", label: "Explore looks", changeFrequency: "daily", priority: 0.7 },
  { path: "/leaderboard", label: "Brand leaderboard", changeFrequency: "daily", priority: 0.5 },
  {
    path: "/leaderboard/creators",
    label: "Creator leaderboard",
    changeFrequency: "daily",
    priority: 0.5,
  },
];

export const companyRoutes: MarketingRoute[] = [
  { path: "/about", label: "About Outfiqe", changeFrequency: "monthly", priority: 0.6 },
  { path: "/how-it-works", label: "How Outfiqe works", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", label: "Contact us", changeFrequency: "yearly", priority: 0.4 },
];

export const audienceRoutes: MarketingRoute[] = [
  { path: "/for-creators", label: "Become a creator", changeFrequency: "monthly", priority: 0.7 },
  {
    path: "/for-creators/how-commissions-work",
    label: "How commissions work",
    changeFrequency: "monthly",
    priority: 0.5,
  },
  { path: "/for-brands", label: "Sell on Outfiqe", changeFrequency: "monthly", priority: 0.7 },
  { path: "/apply", label: "Apply to list your brand", changeFrequency: "monthly", priority: 0.6 },
];

export const supportRoutes: MarketingRoute[] = [
  { path: "/help", label: "Help centre", changeFrequency: "monthly", priority: 0.6 },
  { path: "/size-guide", label: "Size guide", changeFrequency: "monthly", priority: 0.5 },
];

export const legalRoutes: MarketingRoute[] = [
  { path: "/legal/privacy", label: "Privacy policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/terms", label: "Terms of service", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookies", label: "Cookie policy", changeFrequency: "yearly", priority: 0.2 },
  {
    path: "/legal/returns-policy",
    label: "Return & refund policy",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/legal/shipping-policy",
    label: "Shipping & delivery policy",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/legal/creator-terms",
    label: "Creator & affiliate terms",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  { path: "/legal/brand-terms", label: "Seller terms", changeFrequency: "yearly", priority: 0.3 },
  {
    path: "/legal/community-guidelines",
    label: "Community guidelines",
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

export const staticSeoRoutes: MarketingRoute[] = [
  ...primaryCommerceRoutes,
  ...companyRoutes,
  ...audienceRoutes,
  ...supportRoutes,
  ...legalRoutes,
];

export const crawlerDisallowedPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/",
  "/dashboard",
  "/profile",
  "/badges",
  "/challenges",
  "/progress",
  "/earnings",
  "/wallet",
  "/withdraw",
  "/share",
  "/manage-orders",
  "/settings/",
  "/cart",
  "/checkout",
  "/wishlist",
  "/orders",
  "/messages",
  "/payments/",
  "/r/",
  "/api/",
  "/search",
  "/explore/search",
];
