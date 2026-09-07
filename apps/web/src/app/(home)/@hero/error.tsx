"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const HeroError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => (
  <HomeSectionError sectionName="Highlights" error={error} retry={reset} />
);

export default HeroError;
