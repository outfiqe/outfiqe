const BRAND_ORANGE = "#f2680d";
const INK = "#1c1917";
const SUB = "#78716c";
const BORDER = "#e7e2da";
const PAPER = "#ffffff";
const MIST = "#f7f3ee";

type EmailLayoutInput = {
  preheader: string;
  bodyHtml: string;
};

export const renderEmailLayout = ({
  preheader,
  bodyHtml,
}: EmailLayoutInput): string => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${MIST};font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MIST};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${PAPER};border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;color:${INK};">outfiqe<span style="color:${BRAND_ORANGE};">.</span></span>
        </tr></td>
        <tr><td style="padding:20px 32px 32px;color:${INK};font-size:14.5px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid ${BORDER};color:${SUB};font-size:12px;">
          Outfiqe &mdash; Fashion discovery, made in Nepal.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const emailButtonHtml = (label: string, url: string): string =>
  `<a href="${url}" style="display:inline-block;margin-top:18px;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:999px;">${label}</a>`;

export { BRAND_ORANGE, INK, SUB };
