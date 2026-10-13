import Link from "next/link";

import { Logo } from "./Logo";
import { FOOTER_LINK_GROUPS, FOOTER_TAGLINE } from "./siteFooter.constants";

export const FooterLinkColumns = () => (
  <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-5">
    <div className="md:col-span-3 lg:col-span-1">
      <Logo />
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">{FOOTER_TAGLINE}</p>
    </div>

    {FOOTER_LINK_GROUPS.map(({ title, links }) => (
      <nav key={title} aria-label={title}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h3>
        <ul className="mt-4 flex flex-col gap-2.5">
          {links.map(({ href, label }) => (
            <li key={label}>
              <Link
                href={href}
                prefetch={false}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    ))}
  </div>
);
