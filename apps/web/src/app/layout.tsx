import "./globals.css";

import { THEME_INIT_SCRIPT } from "@outfiqe/design-system";
import type { Metadata } from "next";
import { headers } from "next/headers";

import {
  AppleSplashLinks,
  appleWebAppMetadata,
  pwaIcons,
  pwaViewport,
  WEB_MANIFEST_PATH,
} from "@/features/pwa";
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

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AppleSplashLinks />
        <script
          nonce={nonce ?? undefined}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
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
