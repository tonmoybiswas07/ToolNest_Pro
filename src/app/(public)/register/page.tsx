import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { toolReturnTarget } from "@/features/auth/tool-return";
import { AuthPanel } from "@/features/auth/auth-panel";
import { googleAuthEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}) {
  const { error, next } = await searchParams;
  const returnTo = toolReturnTarget(next);
  if (await getSession()) redirect(returnTo ?? "/dashboard");

  return (
    <AuthPanel
      mode="register"
      googleEnabled={googleAuthEnabled()}
      oauthError={Boolean(error)}
      returnTo={returnTo}
    />
  );
}
