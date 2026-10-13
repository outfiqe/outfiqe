import { LifeBuoy, type LucideIcon, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";

export type FooterLink = { label: string; href: string };

export interface FooterLinkGroup {
  title: string;
  icon: LucideIcon;
  links: FooterLink[];
}

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Shop",
    icon: ShoppingBag,
    links: [
      { label: "Shop all", href: "/shop" },
      { label: "Collections", href: "/collections" },
      { label: "Brands", href: "/brands" },
      { label: "Explore looks", href: "/explore" },
      { label: "Muse leaderboard", href: "/leaderboard/creators" },
    ],
  },
  {
    title: "Muses & brands",
    icon: Sparkles,
    links: [
      { label: "Become a muse", href: "/for-creators" },
      { label: "How commissions work", href: "/for-creators/how-commissions-work" },
      { label: "Sell on Outfiqe", href: "/for-brands" },
      { label: "Apply to list your brand", href: "/apply" },
    ],
  },
  {
    title: "Help",
    icon: LifeBuoy,
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Contact us", href: "/contact" },
      { label: "Size guide", href: "/size-guide" },
      { label: "Shipping & delivery", href: "/legal/shipping-policy" },
      { label: "Returns & refunds", href: "/legal/returns-policy" },
      { label: "About Outfiqe", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    title: "Legal",
    icon: ShieldCheck,
    links: [
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Cookie policy", href: "/legal/cookies" },
      { label: "Community guidelines", href: "/legal/community-guidelines" },
      { label: "Muse terms", href: "/legal/creator-terms" },
      { label: "Seller terms", href: "/legal/brand-terms" },
    ],
  },
];

export const FOOTER_ESSENTIAL_LINKS: FooterLink[] = [
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Help", href: "/help" },
];

export const FOOTER_TAGLINE =
  "The one place Nepali shoppers go for fashion: local brands, real muse looks, one checkout.";

export const FOOTER_COMMISSION_DISCLOSURE =
  "Muses may earn a commission when you shop the pieces they've tagged in their looks.";
