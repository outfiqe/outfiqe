export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const railClass = "overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-sm";

export const dividerClass = "my-3 h-px shrink-0 bg-border";

export const navLinkBaseClass = `relative flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 text-sm transition-colors ${focusRingClass}`;

export const navLinkActiveClass = "bg-primary/10 font-semibold text-primary-strong";

export const navLinkInactiveClass =
  "font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground";

export const navLinkActiveIndicatorClass =
  "absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary-strong";

export const toggleButtonClass = `flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRingClass}`;

export const sectionHeadingClass =
  "px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70";

export const sidebarWidthClass = (collapsed: boolean): string =>
  `transition-[width] duration-200 ${collapsed ? "w-[4.5rem]" : "w-60"}`;
