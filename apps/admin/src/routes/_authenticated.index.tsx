import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/AuthContext";

const AdminHomePage = () => {
  const { state } = useAuth();
  const hasPlatformAccess = state.status === "signed-in" && state.user.hasPlatformAccess;

  return <Navigate to={hasPlatformAccess ? "/platform" : "/crm"} replace />;
};

export const Route = createFileRoute("/_authenticated/")({
  component: AdminHomePage,
});
