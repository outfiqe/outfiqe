interface LogoMarkProps {
  className?: string;
}

// Cropped inline copy of /public/logo.svg — raw paths, not <img>, so the viewBox can crop it.
// Kept in sync with apps/web/src/components/LogoMark.tsx.
export const LogoMark = ({ className }: LogoMarkProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="120 120 272 272"
      width="100%"
      height="100%"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#14100E"
        d="M 256,120 C 180,120 120,180 120,256 C 120,332 180,392 256,392 L 256,312 C 225,312 200,287 200,256 C 200,225 225,200 256,200 Z"
      />
      <path fill="#2B2421" d="M 256,120 L 392,256 L 336,312 L 256,232 L 256,120 Z" />
      <path fill="#14100E" d="M 256,312 L 336,312 L 392,368 L 256,368 Z" />
      <circle cx="300" cy="256" r="28" fill="#F85606" />
    </svg>
  );
};
