import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EMAIL_LOGO_RENDER_SIZE } from "@outfiqe/utils";
import { ImageResponse } from "next/og";

import {
  EMAIL_LOGO_FONT_FAMILY,
  EMAIL_LOGO_FONT_WEIGHT,
  EmailLogoLockup,
} from "@/features/email-logo/EmailLogoLockup";

export const dynamic = "force-static";

const wordmarkFont = await readFile(join(process.cwd(), "assets/fonts/cabinet-grotesk-700.ttf"));

export const GET = () =>
  new ImageResponse(<EmailLogoLockup />, {
    ...EMAIL_LOGO_RENDER_SIZE,
    fonts: [
      {
        name: EMAIL_LOGO_FONT_FAMILY,
        data: wordmarkFont,
        style: "normal",
        weight: EMAIL_LOGO_FONT_WEIGHT,
      },
    ],
  });
