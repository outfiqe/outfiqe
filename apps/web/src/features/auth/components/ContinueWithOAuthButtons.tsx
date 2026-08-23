"use client";

import { Button } from "@outfiqe/design-system";

import { buildOAuthStartUrl } from "../api/oauthApi";
import { OAuthProvider } from "../types";
import { FacebookIcon, GoogleIcon } from "./OAuthProviderIcons";

export const ContinueWithOAuthButtons = ({ redirectAfter }: { redirectAfter: string }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" asChild>
        <a href={buildOAuthStartUrl(OAuthProvider.GOOGLE, redirectAfter)}>
          <GoogleIcon />
          Google
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={buildOAuthStartUrl(OAuthProvider.FACEBOOK, redirectAfter)}>
          <FacebookIcon />
          Facebook
        </a>
      </Button>
    </div>
  );
};
