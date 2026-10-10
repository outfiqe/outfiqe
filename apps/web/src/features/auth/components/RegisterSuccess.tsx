import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

export const RegisterSuccess = ({ onGoBack }: { onGoBack: () => void }) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Check your email
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Check your email — we&apos;ve sent you a confirmation link.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Wrong email?{" "}
        <button
          type="button"
          onClick={onGoBack}
          className="font-medium text-primary-strong hover:underline"
        >
          Go back
        </button>{" "}
        to try again.
      </p>
    </div>
  );
};
