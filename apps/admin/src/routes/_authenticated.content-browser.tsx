import { createFileRoute } from "@tanstack/react-router";

import { ContentBrowserPage } from "@/features/content-browser/components/ContentBrowserPage";

export const Route = createFileRoute("/_authenticated/content-browser")({
  component: ContentBrowserPage,
});
