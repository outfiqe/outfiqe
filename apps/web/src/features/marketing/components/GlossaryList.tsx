import Link from "next/link";

import type { GlossaryTerm } from "../constants/glossaryTerms";

export const GlossaryList = ({ terms }: { terms: GlossaryTerm[] }) => (
  <dl className="max-w-2xl divide-y divide-border">
    {terms.map(({ id, term, meaning, example, learnMore }) => (
      <div key={id} id={id} className="scroll-mt-24 py-4">
        <dt className="font-semibold text-foreground">{term}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {meaning}
          {example && <span className="mt-1 block">For example: {example}</span>}
          {learnMore && (
            <Link
              href={learnMore.href}
              className="mt-1 block font-medium text-foreground underline underline-offset-2"
            >
              {learnMore.label}
            </Link>
          )}
        </dd>
      </div>
    ))}
  </dl>
);
