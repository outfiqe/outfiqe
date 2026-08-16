"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { creatorLinksApi } from "@/features/creator-dashboard/api/creatorLinksApi";
import { ApiClientError } from "@/shared/lib/apiClient";

const RedirectPage = () => {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    creatorLinksApi
      .recordClick(token)
      .then(({ targetUrl }) => {
        if (!cancelled) router.replace(targetUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : "This link isn't available.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/" className="text-sm font-semibold text-primary-strong">
            Go to Outfiqe
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      )}
    </div>
  );
};

export default RedirectPage;
