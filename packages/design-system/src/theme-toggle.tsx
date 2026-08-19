"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "./button";
import { cn } from "./cn";
import { useTheme } from "./theme";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={cn("text-foreground", className)}
    >
      {isDark ? (
        <Sun className="size-[18px]" suppressHydrationWarning />
      ) : (
        <Moon className="size-[18px]" suppressHydrationWarning />
      )}
    </Button>
  );
};
