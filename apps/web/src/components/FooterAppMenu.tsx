import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

import { FOOTER_LINK_GROUPS } from "./siteFooter.constants";

export const FooterAppMenu = () => (
  <nav aria-label="More from Outfiqe">
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {FOOTER_LINK_GROUPS.map(({ title, icon: GroupIcon, links }) => (
        <li key={title}>
          <details className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 transition-colors active:bg-muted [&::-webkit-details-marker]:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <GroupIcon className="size-4" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ul className="pb-2">
              {links.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    prefetch={false}
                    className="flex min-h-11 items-center justify-between gap-3 pl-16 pr-4 text-sm text-muted-foreground transition-colors hover:text-foreground active:bg-muted"
                  >
                    {label}
                    <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  </nav>
);
