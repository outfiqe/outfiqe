export interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

// TODO: About/Careers/Contact/Terms/Privacy/Shipping are placeholders until those pages exist
export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Shop",
    links: [
      { label: "Home", href: "/" },
      { label: "Explore", href: "/explore" },
      { label: "For brands", href: "/apply" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Shipping & returns", href: "#" },
    ],
  },
];
