const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const COLOR = {
  pageBackground: "#f6f3ee",
  card: "#ffffff",
  border: "#dfe4e3",
  borderStrong: "#c7d1cf",
  ink: "#1c2226",
  muted: "#63707a",
  primary: "#31d6c8",
  primaryText: "#0f2426",
  primaryStrong: "#157679",
  primaryTint: "#e2faf7",
  secondary: "#1c262b",
  success: "#1c7c50",
  successTint: "#e5f4ec",
  destructive: "#cf3320",
  destructiveTint: "#fbeae7",
  neutralTint: "#eef1f0",
} as const;

const CARD_MAX_WIDTH = 512;
const CARD_RADIUS = 12;
const BUTTON_RADIUS = 999;
const PILL_RADIUS = 999;

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character] ?? character);

export const paragraphsHtml = (text: string): string =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 12px;color:${COLOR.ink};line-height:1.6;white-space:pre-wrap;">${block.replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

export const emailEyebrow = (label: string): string =>
  `<p style="margin:0 0 8px;color:${COLOR.primaryStrong};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">${escapeHtml(label)}</p>`;

export const emailHeading = (text: string): string =>
  `<h1 style="margin:0 0 6px;color:${COLOR.ink};font-size:21px;font-weight:800;letter-spacing:-.01em;line-height:1.3;">${escapeHtml(text)}</h1>`;

export const emailSubheading = (text: string): string =>
  `<h2 style="margin:24px 0 10px;color:${COLOR.ink};font-size:15px;font-weight:700;line-height:1.4;">${escapeHtml(text)}</h2>`;

export const emailLede = (text: string): string =>
  `<p style="margin:0;color:${COLOR.muted};font-size:14.5px;line-height:1.6;">${escapeHtml(text)}</p>`;

export const emailText = (text: string): string =>
  `<p style="margin:0 0 12px;color:${COLOR.ink};font-size:14.5px;line-height:1.6;">${escapeHtml(text)}</p>`;

export const emailMuted = (text: string): string =>
  `<p style="margin:12px 0 0;color:${COLOR.muted};font-size:13px;line-height:1.6;">${escapeHtml(text)}</p>`;

export const emailDivider = (): string =>
  `<div style="margin:20px 0;border-top:1px solid ${COLOR.border};line-height:0;font-size:0;">&nbsp;</div>`;

export const emailButtonHtml = (label: string, url: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr><td style="border-radius:${BUTTON_RADIUS}px;background:${COLOR.primary};">
      <a href="${url}" style="display:inline-block;padding:12px 26px;color:${COLOR.primaryText};font-family:${FONT_STACK};font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

type PillTone = "success" | "destructive" | "neutral";

const PILL_TONE_STYLE: Record<PillTone, { background: string; color: string }> = {
  success: { background: COLOR.successTint, color: COLOR.success },
  destructive: { background: COLOR.destructiveTint, color: COLOR.destructive },
  neutral: { background: COLOR.neutralTint, color: COLOR.ink },
};

export const emailStatusPill = (label: string, tone: PillTone): string => {
  const { background, color } = PILL_TONE_STYLE[tone];
  return `<span style="display:inline-block;margin:0 0 14px;padding:5px 14px;border-radius:${PILL_RADIUS}px;background:${background};color:${color};font-size:12px;font-weight:700;letter-spacing:.02em;">${escapeHtml(label)}</span>`;
};

export type EmailMetaRow = { label: string; value: string };

export const emailMetaTable = (rows: EmailMetaRow[]): string => {
  const rowsHtml = rows
    .map(
      (row, index) => `<tr>
        <td style="padding:${index === 0 ? 0 : 10}px 0 0;color:${COLOR.muted};font-size:13px;line-height:1.5;">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:${index === 0 ? 0 : 10}px 0 0;color:${COLOR.ink};font-size:13px;font-weight:700;line-height:1.5;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;padding:16px;background:${COLOR.pageBackground};border:1px solid ${COLOR.border};border-radius:${CARD_RADIUS - 2}px;">${rowsHtml}</table>`;
};

export const emailInfoPanel = (html: string): string =>
  `<div style="margin:0 0 16px;padding:16px;background:${COLOR.pageBackground};border:1px solid ${COLOR.border};border-radius:${CARD_RADIUS - 2}px;">${html}</div>`;

export const emailSecurityNote = (text: string): string =>
  `<div style="margin:20px 0 0;padding:12px 14px;background:${COLOR.neutralTint};border-radius:${CARD_RADIUS - 4}px;color:${COLOR.muted};font-size:12.5px;line-height:1.6;">${escapeHtml(text)}</div>`;

type EmailLayoutInput = {
  preheader: string;
  bodyHtml: string;
};

export const renderEmailLayout = ({
  preheader,
  bodyHtml,
}: EmailLayoutInput): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background:${COLOR.pageBackground};font-family:${FONT_STACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.pageBackground};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${CARD_MAX_WIDTH}px;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:${CARD_RADIUS}px;">
        <tr><td style="padding:28px 32px 20px;">
          <span style="font-family:${FONT_STACK};font-weight:800;font-size:20px;letter-spacing:-.02em;">
            <span style="color:${COLOR.primaryStrong};">out</span><span style="color:${COLOR.secondary};">fiqe.</span>
          </span>
        </td></tr>
        <tr><td style="padding:0 32px 32px;color:${COLOR.ink};font-size:14.5px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid ${COLOR.border};color:${COLOR.muted};font-size:12px;">
          Outfiqe. Fashion discovery, made in Nepal.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
