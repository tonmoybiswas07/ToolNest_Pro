import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/auth-panel";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return <AuthPanel mode="register" />;
}
