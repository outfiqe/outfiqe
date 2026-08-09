import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "./Button";

const NAV_LINKS = [
  { to: "/", label: "Brand applications" },
  { to: "/products", label: "Products" },
  { to: "/creators", label: "Creators" },
  { to: "/team", label: "Team" },
] as const;

const navLinkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const navLinkActiveClass = "bg-muted text-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth();
  const user = state.status === "signed-in" ? state.user : null;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            outfiqe<span className="text-primary">.</span>
            <span className="ml-1 align-middle text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin
            </span>
          </span>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                className={navLinkClass}
                activeProps={{ className: navLinkActiveClass }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && <span className="text-sm text-muted-foreground">{user.name}</span>}
            <Button variant="outline" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
