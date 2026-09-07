"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const NewArrivalsError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <HomeSectionError sectionName="New arrivals" error={error} retry={reset} />;

export default NewArrivalsError;
