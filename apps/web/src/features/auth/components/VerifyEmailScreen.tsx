"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import { Label } from "@/design-system/components/ui/label";
import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";
import { authApi } from "../api/authApi";
import { useResendVerification } from "../hooks/useResendVerification";
import { emailField } from "../schemas/shared.schema";

type VerifyStatus = "loading" | "success" | "error";

const VerifyEmailLoading = () => {
  return (
    <div role="status" aria-live="polite">
      <h1 className="font-display text-[28px] font-bold text-foreground">Verifying your email…</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">This only takes a moment.</p>
    </div>
  );
};

const VerifyEmailSuccess = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Email verified
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Your email is verified. You can now sign in.
      </p>
      <Link href="/login" className="mt-5 inline-block">
        <Button>Continue to sign in</Button>
      </Link>
    </div>
  );
};

const VerifyEmailError = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const resend = useResendVerification();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const parsedEmail = emailField.safeParse(email);
  const isEmailValid = parsedEmail.success;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isEmailValid) resend.mutate(parsedEmail.data);
  };

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Link no longer valid
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        This verification link is invalid or has expired.
      </p>

      {resend.isSuccess ? (
        <p className="mt-5 text-sm text-muted-foreground" role="alert">
          New link sent — check your email.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-5">
          <Label htmlFor="resend-email">Email address</Label>
          <Input
            id="resend-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            autoComplete="email"
          />
          {touched && !isEmailValid && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
              Enter a valid email address
            </p>
          )}
          <Button type="submit" className="mt-4 w-full" disabled={resend.isPending}>
            {resend.isPending ? "Sending…" : "Request a new link"}
          </Button>
        </form>
      )}
    </div>
  );
};

export const VerifyEmailScreen = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [asyncStatus, setAsyncStatus] = useState<"loading" | "success" | "error">("loading");

  const called = useRef(false);

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setAsyncStatus("success"))
      .catch(() => setAsyncStatus("error"));
  }, [token]);

  const status: VerifyStatus = token ? asyncStatus : "error";

  if (status === "loading") return <VerifyEmailLoading />;
  if (status === "success") return <VerifyEmailSuccess />;
  return <VerifyEmailError />;
};
