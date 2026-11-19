import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/features/auth/auth-panel";
import { googleAuthEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;

  return <AuthPanel mode="login" googleEnabled={googleAuthEnabled()} oauthError={Boolean(error)} />;
}
