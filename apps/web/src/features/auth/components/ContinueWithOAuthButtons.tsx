"use client";

import { Button } from "@outfiqe/design-system";

import { buildOAuthStartUrl } from "../api/oauthApi";
import { OAuthProvider } from "../types";
import { FacebookIcon, GoogleIcon } from "./OAuthProviderIcons";

const FACEBOOK_COMING_SOON_HINT = "Facebook sign-in will be available soon";

export const ContinueWithOAuthButtons = ({ redirectAfter }: { redirectAfter: string }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" asChild>
        <a href={buildOAuthStartUrl(OAuthProvider.GOOGLE, redirectAfter)}>
          <GoogleIcon />
          Google
        </a>
      </Button>
      <span className="inline-flex w-full" title={FACEBOOK_COMING_SOON_HINT}>
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-not-allowed"
          disabled
          aria-label={FACEBOOK_COMING_SOON_HINT}
        >
          <FacebookIcon />
          Facebook
        </Button>
      </span>
    </div>
  );
};
