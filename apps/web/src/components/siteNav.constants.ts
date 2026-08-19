export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/collections" },
  { label: "Brands", href: "/brands" },
] as const;

export const LEADERBOARD_LINKS = [
  { label: "Trending brands", href: "/leaderboard?category=trending" },
  { label: "Most purchased", href: "/leaderboard?category=most-purchased" },
  { label: "Most loved", href: "/leaderboard?category=most-loved" },
  { label: "Fastest growing", href: "/leaderboard?category=fastest-growing" },
] as const;
