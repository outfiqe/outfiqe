import "./globals.css";

import { THEME_INIT_SCRIPT } from "@outfiqe/design-system";
import type { Metadata } from "next";

import {
  AppleSplashLinks,
  appleWebAppMetadata,
  PWA_KILL_SWITCH_ATTRIBUTE,
  pwaIcons,
  pwaViewport,
  WEB_MANIFEST_PATH,
} from "@/features/pwa";
import { isPwaKillSwitchEngagedOnServer } from "@/features/pwa/utils/pwaKillSwitchServer";
import {
  JsonLd,
  organizationSchema,
  rootMetadataDefaults,
  siteUrl,
  websiteSchema,
} from "@/shared/seo";

import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...rootMetadataDefaults,
  manifest: WEB_MANIFEST_PATH,
  icons: pwaIcons,
  appleWebApp: appleWebAppMetadata,
};

export const viewport = pwaViewport;

const apiOrigin = (() => {
  const configured = process.env.API_PUBLIC_URL ?? process.env.API_URL;
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
})();

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const pwaKilled = isPwaKillSwitchEngagedOnServer();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      {...(pwaKilled ? { [PWA_KILL_SWITCH_ATTRIBUTE]: "true" } : {})}
    >
      <head>
        {apiOrigin && (
          <>
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        )}
        <AppleSplashLinks />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <JsonLd id="organization-jsonld" data={organizationSchema()} />
        <JsonLd id="website-jsonld" data={websiteSchema()} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
