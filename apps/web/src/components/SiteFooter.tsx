import Link from "next/link";

import { FooterAppMenu } from "./FooterAppMenu";
import { FooterLinkColumns } from "./FooterLinkColumns";
import { Logo } from "./Logo";
import { FOOTER_COMMISSION_DISCLOSURE, FOOTER_ESSENTIAL_LINKS } from "./siteFooter.constants";

const FIRST_LINK_INDEX = 0;

export const SiteFooter = () => (
  <footer className="px-4 pb-8 pt-10 sm:px-6 md:py-16 lg:px-10">
    <div className="md:hidden">
      <FooterAppMenu />
    </div>
    <div className="hidden border-t border-border pt-10 md:block">
      <FooterLinkColumns />
    </div>

    <div className="mt-8 flex flex-col items-center gap-3 text-center md:mt-10 md:items-start md:border-t md:border-border md:pt-6 md:text-left">
      <Logo size="sm" className="md:hidden" />
      <nav aria-label="Legal and help" className="md:hidden">
        <ul className="flex items-center gap-2 text-xs text-muted-foreground">
          {FOOTER_ESSENTIAL_LINKS.map(({ href, label }, index) => (
            <li key={label} className="flex items-center gap-2">
              {index > FIRST_LINK_INDEX && <span aria-hidden>·</span>}
              <Link href={href} prefetch={false} className="hover:text-foreground">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="max-w-sm text-xs text-muted-foreground md:max-w-none">
        {FOOTER_COMMISSION_DISCLOSURE}
      </p>
      <p className="text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Outfiqe. All rights reserved.
      </p>
    </div>
  </footer>
);
