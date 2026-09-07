"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const TrendingError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <HomeSectionError sectionName="Trending now" error={error} retry={reset} />;

export default TrendingError;
