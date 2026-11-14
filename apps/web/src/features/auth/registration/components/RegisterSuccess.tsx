import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

type RegisterSuccessProps = {
  email: string;
  onGoBack: () => void;
};

export const RegisterSuccess = ({ email, onGoBack }: RegisterSuccessProps) => {
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
        We&apos;ve sent a confirmation link to{" "}
        <span className="break-all font-semibold text-foreground">{email}</span>. Open it to finish
        creating your account.
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
