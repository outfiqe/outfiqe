import type { Metadata } from "next";
import { LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <main>
      <LoginForm />
    </main>
  );
}
