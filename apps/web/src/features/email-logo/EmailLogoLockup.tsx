import {
  lightThemeBrandHex,
  LOGO_MARK_PATHS,
  LOGO_MARK_VIEWBOX,
  LOGO_TONE_TOKEN,
  LOGO_WORDMARK_SEGMENTS,
} from "@outfiqe/design-system";

export const EMAIL_LOGO_FONT_FAMILY = "Cabinet Grotesk";

export const EMAIL_LOGO_FONT_WEIGHT = 700;

const HEADER_WORDMARK_FONT_PX = 24;
const HEADER_MARK_PX = 28;
const HEADER_GAP_PX = 8;
const WORDMARK_FONT_PX = 56;
const HEADER_TO_EMAIL_SCALE = WORDMARK_FONT_PX / HEADER_WORDMARK_FONT_PX;
const TRACKING_TIGHT_EM = -0.025;

export const EmailLogoLockup = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "100%",
      gap: HEADER_GAP_PX * HEADER_TO_EMAIL_SCALE,
    }}
  >
    <svg
      viewBox={LOGO_MARK_VIEWBOX}
      width={HEADER_MARK_PX * HEADER_TO_EMAIL_SCALE}
      height={HEADER_MARK_PX * HEADER_TO_EMAIL_SCALE}
    >
      {LOGO_MARK_PATHS.map(({ d, tone }) => (
        <path key={d} d={d} fill={lightThemeBrandHex(LOGO_TONE_TOKEN[tone])} />
      ))}
    </svg>
    <div
      style={{
        display: "flex",
        fontFamily: EMAIL_LOGO_FONT_FAMILY,
        fontWeight: EMAIL_LOGO_FONT_WEIGHT,
        fontSize: WORDMARK_FONT_PX,
        letterSpacing: `${TRACKING_TIGHT_EM}em`,
      }}
    >
      {LOGO_WORDMARK_SEGMENTS.map(({ text, tone }) => (
        <span key={text} style={{ color: lightThemeBrandHex(LOGO_TONE_TOKEN[tone]) }}>
          {text}
        </span>
      ))}
    </div>
  </div>
);
