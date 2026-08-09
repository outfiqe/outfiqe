import Link from "next/link";

import { Logo } from "./Logo";
import { FOOTER_LINK_GROUPS } from "./siteFooter.constants";

export function SiteFooter() {
  return (
    <footer className="px-6 py-12 sm:py-16 lg:px-10">
      <div className="grid gap-10 border-t border-border pt-10 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            The one place Nepali shoppers go for fashion: local brands, real creator looks, one
            checkout.
          </p>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              {group.title}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Outfiqe. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">Made for Nepal.</p>
      </div>
    </footer>
  );
}
