export interface HeroSlide {
  id: string;
  tag: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  image?: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "dashain-edit-26",
    tag: "Collection 01: Festive",
    title: "Dashain\nEdit '26",
    description:
      "Daura suruwal, kurta sets and modern cuts from eleven Kathmandu labels. Styled as full looks, not loose items.",
    cta: { label: "Explore collection", href: "#" },
    image: "/hero/returnof90s.jpg",
  },
  {
    id: "creator-looks",
    tag: "Collection 02: Creators",
    title: "Shop the\nlooks you scroll",
    description:
      "Every outfit tagged by the Nepali creators who styled it. Tap a look, get the full fit.",
    cta: { label: "See creator looks", href: "#" },
    image: "/hero/creator-looks.png",
  },
  {
    id: "new-brands",
    tag: "Collection 03: Just In",
    title: "New brands,\nfresh this week",
    description: "Five new Kathmandu labels just went live, all vetted and set up by our team.",
    cta: { label: "Browse new brands", href: "#" },
    image: "/hero/banner3.jpg",
  },
];
