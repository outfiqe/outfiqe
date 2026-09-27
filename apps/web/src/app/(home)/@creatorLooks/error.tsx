"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const CreatorLooksError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <HomeSectionError sectionName="Muse looks" error={error} retry={reset} />;

export default CreatorLooksError;
