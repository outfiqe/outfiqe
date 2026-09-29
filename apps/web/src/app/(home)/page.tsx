import type { Metadata } from "next";

import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Outfiqe: Nepali fashion, worn by real muses",
  absoluteTitle: true,
  description:
    "See how clothes from Nepali brands actually fit before you buy, in real muse looks. One cart across every brand. Pay cash on delivery or by wallet, delivered across Nepal.",
  path: "/",
  keywords: [
    "Nepali fashion",
    "online clothing store Nepal",
    "Nepali clothing brands",
    "buy clothes online Nepal",
    "muse fashion Nepal",
  ],
});

const HomePage = () => null;

export default HomePage;
