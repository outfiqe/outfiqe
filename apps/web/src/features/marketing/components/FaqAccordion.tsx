import { Plus } from "lucide-react";

import type { FaqEntry } from "@/shared/seo";
import { faqPageSchema, JsonLd } from "@/shared/seo";

interface FaqAccordionProps {
  entries: FaqEntry[];
  withSchema?: boolean;
  schemaId?: string;
}

export const FaqAccordion = ({
  entries,
  withSchema = false,
  schemaId = "faq-jsonld",
}: FaqAccordionProps) => (
  <>
    <div className="divide-y divide-border border-y border-border">
      {entries.map((entry) => (
        <details key={entry.question} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground marker:hidden">
            {entry.question}
            <Plus
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
              aria-hidden
            />
          </summary>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
        </details>
      ))}
    </div>
    {withSchema ? <JsonLd id={schemaId} data={faqPageSchema(entries)} /> : null}
  </>
);
