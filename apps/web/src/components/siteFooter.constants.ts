export interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Shop",
    links: [
      { label: "Shop all", href: "/shop" },
      { label: "Collections", href: "/collections" },
      { label: "Brands", href: "/brands" },
      { label: "Explore looks", href: "/explore" },
      { label: "Creator leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Creators & brands",
    links: [
      { label: "Become a creator", href: "/for-creators" },
      { label: "How commissions work", href: "/for-creators/how-commissions-work" },
      { label: "Sell on Outfiqe", href: "/for-brands" },
      { label: "Apply to list your brand", href: "/apply" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Size guide", href: "/size-guide" },
      { label: "Shipping & delivery", href: "/legal/shipping-policy" },
      { label: "Returns & refunds", href: "/legal/returns-policy" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Cookie policy", href: "/legal/cookies" },
      { label: "Community guidelines", href: "/legal/community-guidelines" },
      { label: "Creator terms", href: "/legal/creator-terms" },
      { label: "Seller terms", href: "/legal/brand-terms" },
    ],
  },
];
