import { Button } from "@outfiqe/design-system";
import { useNavigate } from "@tanstack/react-router";

const HEADING_ID = "no-section-access-heading";

export const NoSectionAccess = ({ homeHref }: { homeHref: string | null }) => {
  const navigate = useNavigate();

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <h1 id={HEADING_ID} className="font-display text-2xl font-bold text-foreground">
        You don&apos;t have access to this section
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {homeHref
          ? "Your role doesn't include this part of the admin panel. If you need it, ask a co-founder to update your role."
          : "Your role doesn't include any admin pages yet. Ask a co-founder to give your role the permissions you need."}
      </p>
      {homeHref && (
        <Button className="mt-5" onClick={() => void navigate({ href: homeHref })}>
          Go to your workspace
        </Button>
      )}
    </section>
  );
};
