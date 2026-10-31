import { BACK_LINK_CLASS_NAME, BackLinkLabel } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const BackLink = ({
  to,
  params,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  children: ReactNode;
}) => (
  <Link to={to} params={params} className={BACK_LINK_CLASS_NAME}>
    <BackLinkLabel>{children}</BackLinkLabel>
  </Link>
);
