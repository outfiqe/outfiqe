export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const railClass = "sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col gap-4";

export const cardClass = "rounded-[28px] border border-border bg-card p-3 shadow-sm";

export const navListClass = "flex flex-col gap-1.5";

export const navLinkBaseClass = `relative flex items-center rounded-2xl text-sm transition-colors ${focusRingClass}`;

export const navLinkCollapsedClass = "size-11 shrink-0 justify-center";

export const navLinkExpandedClass = "min-w-0 flex-1 gap-3 px-3.5 py-2.5";

export const navLinkActiveClass = "bg-primary font-semibold text-primary-foreground shadow-sm";

export const navLinkInactiveClass =
  "font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

export const toggleButtonClass = `flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground ${focusRingClass}`;

export const sectionHeadingClass =
  "px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70";

export const footerListClass = "flex flex-col gap-1.5";

export const sidebarWidthClass = (collapsed: boolean): string =>
  `transition-[width] duration-200 ${collapsed ? "w-[4.75rem]" : "w-64"}`;
