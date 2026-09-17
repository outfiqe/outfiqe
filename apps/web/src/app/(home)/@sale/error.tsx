"use client";

import { HomeSectionError } from "@/components/HomeSectionError";

const SaleError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => (
  <HomeSectionError sectionName="On Sale" error={error} retry={reset} />
);

export default SaleError;
