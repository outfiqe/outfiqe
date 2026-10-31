import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export const BACK_LINK_CLASS_NAME =
  "mb-4 flex w-fit cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden";

export const BackLinkLabel = ({ children }: { children: ReactNode }) => (
  <>
    <ArrowLeft className="size-4 shrink-0" aria-hidden />
    {children}
  </>
);
