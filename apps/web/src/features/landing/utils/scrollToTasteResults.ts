export const TASTE_RESULTS_SECTION_ID = "taste-results";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const scrollToTasteResults = (): void => {
  const resultsSection = document.getElementById(TASTE_RESULTS_SECTION_ID);
  if (!resultsSection) return;

  const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  resultsSection.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
};
