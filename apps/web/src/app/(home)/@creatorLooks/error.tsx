"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const CreatorLooksError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <HomeSectionError sectionName="Creator looks" error={error} retry={reset} />;

export default CreatorLooksError;
