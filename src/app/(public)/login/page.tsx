import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/auth-panel";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return <AuthPanel mode="login" />;
}
