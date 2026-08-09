type Tone = "neutral" | "positive" | "negative";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  positive: "bg-primary/10 text-primary-strong",
  negative: "bg-destructive/10 text-destructive",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
