"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const TasteError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <HomeSectionError sectionName="Explore your taste" error={error} retry={reset} />;

export default TasteError;
