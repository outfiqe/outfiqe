"use client";

import { Button, Input, Label } from "@outfiqe/design-system";
import { useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";
import { ApiClientError } from "@/shared/lib/apiClient";

import { authApi } from "../../api/authApi";
import { useResendVerification } from "../../hooks/useResendVerification";
import { emailField } from "../../schemas/shared.schema";
import { AuthErrorCode, getAuthErrorMessage } from "../../utils/authErrors";
import { VerifyEmailLoading } from "./VerifyEmailLoading";
import { VerifyEmailSuccess } from "./VerifyEmailSuccess";

enum VerifyStatusEnum {
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

type VerifyStatus = VerifyStatusEnum.LOADING | VerifyStatusEnum.SUCCESS | VerifyStatusEnum.ERROR;

// INVALID_TOKEN/TOKEN_EXPIRED (and a missing token) are exactly what this screen's
// copy already describes; anything else (network failure, rate limiting, ...) gets
// its own accurate message instead of the misleading "link no longer valid" text.
const isExpiredOrInvalidLink = (error: unknown): boolean => {
  if (!(error instanceof ApiClientError)) return true;
  return error.code === AuthErrorCode.INVALID_TOKEN || error.code === AuthErrorCode.TOKEN_EXPIRED;
};

const VerifyEmailError = ({ error }: { error: unknown }) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const resend = useResendVerification();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const parsedEmail = emailField.safeParse(email);
  const isEmailValid = parsedEmail.success;

  const onSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (isEmailValid) resend.mutate(parsedEmail.data);
  };

  const description = isExpiredOrInvalidLink(error)
    ? "This verification link is invalid or has expired."
    : (getAuthErrorMessage(error instanceof ApiClientError ? error.code : undefined) ??
      "This verification link is invalid or has expired.");

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Link no longer valid
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">{description}</p>

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

  const [asyncStatus, setAsyncStatus] = useState<VerifyStatus>(VerifyStatusEnum.LOADING);
  const [error, setError] = useState<unknown>(null);

  const called = useRef(false);

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setAsyncStatus(VerifyStatusEnum.SUCCESS))
      .catch((err: unknown) => {
        setError(err);
        setAsyncStatus(VerifyStatusEnum.ERROR);
      });
  }, [token]);

  const status: VerifyStatusEnum = token ? asyncStatus : VerifyStatusEnum.ERROR;

  if (status === VerifyStatusEnum.LOADING) return <VerifyEmailLoading />;
  if (status === VerifyStatusEnum.SUCCESS) return <VerifyEmailSuccess />;
  return <VerifyEmailError error={error} />;
};
