export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const railClass = "space-y-4 rounded-2xl border border-border bg-card p-3 shadow-sm";

export const navLinkBaseClass = `flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm transition-colors ${focusRingClass}`;

export const navLinkActiveClass = "bg-primary font-semibold text-primary-foreground shadow-sm";

export const navLinkInactiveClass =
  "font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

export const toggleButtonClass = `flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRingClass}`;

export const sectionHeadingClass =
  "px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const sidebarWidthClass = (collapsed: boolean): string =>
  `transition-[width] duration-200 ${collapsed ? "w-[4.5rem]" : "w-56"}`;
