import { cn } from "./cn";
import {
  LOGO_MARK_PATHS,
  LOGO_MARK_VIEWBOX,
  LOGO_TONE_FILL_CLASS,
  LOGO_TONE_TEXT_CLASS,
  LOGO_WORDMARK_SEGMENTS,
} from "./logo.constants";

interface LogoMarkProps {
  className?: string;
}

export const LogoMark = ({ className }: LogoMarkProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_MARK_VIEWBOX}
      width="100%"
      height="100%"
      className={cn("text-foreground", className)}
      aria-hidden="true"
    >
      {LOGO_MARK_PATHS.map(({ d, tone }) => (
        <path key={d} fill="currentColor" className={LOGO_TONE_FILL_CLASS[tone]} d={d} />
      ))}
    </svg>
  );
};

interface LogoWordmarkProps {
  className?: string;
}

export const LogoWordmark = ({ className }: LogoWordmarkProps) => (
  <span className={className}>
    {LOGO_WORDMARK_SEGMENTS.map(({ text, tone }) => (
      <span key={text} className={LOGO_TONE_TEXT_CLASS[tone]}>
        {text}
      </span>
    ))}
  </span>
);
