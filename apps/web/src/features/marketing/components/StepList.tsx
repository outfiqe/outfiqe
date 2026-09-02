export interface Step {
  title: string;
  body: string;
}

interface StepListProps {
  steps: Step[];
}

export const StepList = ({ steps }: StepListProps) => (
  <ol className="grid gap-8 sm:grid-cols-3">
    {steps.map((step, index) => (
      <li key={step.title}>
        <span className="font-display text-3xl font-bold text-primary-strong" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-foreground">
          {step.title}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
      </li>
    ))}
  </ol>
);
