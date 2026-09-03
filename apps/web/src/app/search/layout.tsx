import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const SearchLayout = ({ children }: { children: ReactNode }) => children;

export default SearchLayout;
