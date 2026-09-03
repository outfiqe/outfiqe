"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { ADMIN_URL } from "@/features/auth/utils/getDefaultRoute";
import { useTenantHost } from "@/shared/hooks/useTenantHost";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";

export const AccountMenu = () => {
  const { state, isAuthenticated, isBrandOwner, isAdmin, isCreator, hasCrmAccess } = useAuth();
  const logout = useLogout();
  const isOnTenantHost = useTenantHost();

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return <Skeleton aria-hidden className="hidden size-9 rounded-full lg:block" />;
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
  const { avatarUrl, id, name } = user ?? {};

  const avatar = (
    <div
      className="flex size-full items-center justify-center bg-cover bg-center"
      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
    >
      {!avatarUrl && (
        <span
          aria-hidden
          className="flex size-full items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: getAvatarColor(id ?? "") }}
        >
          {initialsFor(name ?? "")}
        </span>
      )}
    </div>
  );

  return (
    <div className="group relative hidden lg:block">
      {isAdmin ? (
        <a
          href={ADMIN_URL}
          aria-label="Dashboard"
          className="block size-9 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
        >
          {avatar}
        </a>
      ) : (
        <Link
          href="/profile"
          aria-label="Your account"
          className="block size-9 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
        >
          {avatar}
        </Link>
      )}

      <div className="invisible absolute right-0 top-full z-20 w-56 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="mt-2 rounded-xl border border-border bg-card p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-sm font-semibold text-foreground">{name}</p>

          {isAdmin ? (
            <a
              href={ADMIN_URL}
              className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              Dashboard
            </a>
          ) : (
            <Link
              href="/profile"
              className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              {isBrandOwner ? "Brand dashboard" : "Dashboard"}
            </Link>
          )}
          {hasCrmAccess && !isAdmin && isOnTenantHost && (
            <a
              href={`${ADMIN_URL}/crm`}
              className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              CRM
            </a>
          )}
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
          <Link
            href="/orders"
            className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            Your orders
          </Link>

          {!isBrandOwner && !isAdmin && !isCreator && (
            <>
              <div className="my-1.5 h-px bg-border" />
              <Link
                href="/profile"
                className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                Become a creator
              </Link>
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
    </div>
  );
};
