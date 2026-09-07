"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const CollectionsError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <HomeSectionError sectionName="Collections" error={error} retry={reset} />;

export default CollectionsError;
