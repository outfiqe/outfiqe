import { AlertTriangle } from "lucide-react";

interface LegalDocumentProps {
  title: string;
  summary: string;
  lastReviewed: string;
  status: "draft" | "published";
  children: React.ReactNode;
}

const proseClasses = [
  "mt-10 space-y-4 text-sm leading-relaxed text-muted-foreground",
  "[&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground",
  "[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-foreground",
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
  "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
].join(" ");

export const LegalDocument = ({
  title,
  summary,
  lastReviewed,
  status,
  children,
}: LegalDocumentProps) => (
  <article>
    <p className="text-xs font-bold uppercase tracking-widest text-primary-strong">Legal</p>
    <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">
      {title}
    </h1>
    <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{summary}</p>
    <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
      Last reviewed: {lastReviewed}
    </p>

    {status === "draft" ? (
      <div className="mt-6 flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
        <p>
          <strong className="text-foreground">Working draft.</strong> This document is pending a
          formal review and is not yet legally binding. Bracketed items marked{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs">NEEDS INPUT</code> require
          confirmed company details before publication.
        </p>
      </div>
    ) : null}

    <div className={proseClasses}>{children}</div>
  </article>
);
