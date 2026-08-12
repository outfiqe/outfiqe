import { useNavigate } from "@tanstack/react-router";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";

import { useAuth } from "@/features/auth/AuthContext";

export function AccountMenu() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  if (state.status !== "signed-in") return null;

  const { user } = state;

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label="Your account"
        className="block size-9 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
      >
        <div
          className="flex size-full items-center justify-center bg-cover bg-center"
          style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
        >
          {!user.avatarUrl && (
            <span
              aria-hidden
              className="flex size-full items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getAvatarColor(user.id) }}
            >
              {initialsFor(user.name)}
            </span>
          )}
        </div>
      </button>

      <div className="invisible absolute right-0 top-full z-20 w-56 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="mt-2 rounded-xl border border-border bg-card p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-sm font-semibold text-foreground">{user.name}</p>

          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            Edit profile
          </button>

          <div className="my-1.5 h-px bg-border" />
          <button
            type="button"
            onClick={() => logout()}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
