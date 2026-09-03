import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Search looks",
  robots: { index: false, follow: true },
};

const ExploreSearchLayout = ({ children }: { children: ReactNode }) => children;

export default ExploreSearchLayout;
