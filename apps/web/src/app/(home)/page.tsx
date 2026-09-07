import type { Metadata } from "next";

import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Outfiqe: Nepali fashion, worn by real creators",
  absoluteTitle: true,
  description:
    "See how clothes from Nepali brands actually fit before you buy, in real creator looks. One cart across every brand. Pay cash on delivery or by wallet, delivered across Nepal.",
  path: "/",
  keywords: [
    "Nepali fashion",
    "online clothing store Nepal",
    "Nepali clothing brands",
    "buy clothes online Nepal",
    "creator fashion Nepal",
  ],
});

const HomePage = () => null;

export default HomePage;
