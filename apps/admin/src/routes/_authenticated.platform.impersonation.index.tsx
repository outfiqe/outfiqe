import { createFileRoute } from "@tanstack/react-router";

import { PlatformImpersonationPage } from "@/features/platform-impersonation/components/PlatformImpersonationPage";

export const Route = createFileRoute("/_authenticated/platform/impersonation/")({
  component: PlatformImpersonationPage,
});
