"use client";

import { Button } from "@outfiqe/design-system";
import Link from "next/link";
import { useState } from "react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";

import { CreatorModeModal } from "./CreatorModeModal";

export function AccountMenu() {
  const { state, isAuthenticated, isBrandOwner, isAdmin, isCreator } = useAuth();
  const logout = useLogout();
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return <div className="hidden h-9 w-9 lg:block" aria-hidden />;
  }

  if (!isAuthenticated) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  const user = state.user;

  return (
    <div className="group relative hidden lg:block">
      <Link
        href="/dashboard"
        aria-label="Your account"
        className="block size-9 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
      >
        <div
          className="flex size-full items-center justify-center bg-cover bg-center"
          style={user?.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
        >
          {!user?.avatarUrl && (
            <span
              aria-hidden
              className="flex size-full items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getAvatarColor(user?.id ?? "") }}
            >
              {initialsFor(user?.name ?? "")}
            </span>
          )}
        </div>
      </Link>

      <div className="invisible absolute right-0 top-full z-20 w-56 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="mt-2 rounded-xl border border-border bg-card p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-sm font-semibold text-foreground">{user?.name}</p>

          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            {isBrandOwner ? "Brand dashboard" : "Dashboard"}
          </Link>
          <Link
            href="/wishlist"
            className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            Saved items
          </Link>
          <Link
            href="/cart"
            className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            Your bag
          </Link>

          {!isBrandOwner && !isAdmin && (
            <>
              <div className="my-1.5 h-px bg-border" />
              {isCreator ? (
                <button
                  type="button"
                  onClick={() => setCreatorModalOpen(true)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  Switch to creator mode
                </button>
              ) : (
                <Link
                  href="/dashboard/posts"
                  className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Become a creator
                </Link>
              )}
            </>
          )}

          <div className="my-1.5 h-px bg-border" />
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-60"
          >
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>

      <CreatorModeModal open={creatorModalOpen} onClose={() => setCreatorModalOpen(false)} />
    </div>
  );
}
