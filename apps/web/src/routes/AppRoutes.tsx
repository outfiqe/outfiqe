import { Route, Routes } from "react-router";
import { LoginForm } from "@/features/auth";
import { UserList } from "@/features/users";

// Thin routing layer. Pages compose features - they don't contain
// feature logic themselves.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/users" element={<UserList />} />
      <Route path="/" element={<UserList />} />
    </Routes>
  );
}
