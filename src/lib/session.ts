import "server-only";

import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "@/lib/auth";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return null;

  const auth = await getAuth();
  if (!auth) return null;

  const session = await auth.api.getSession({ headers: requestHeaders, query: { disableRefresh: true } });
  if (session?.user.banned && (!session.user.banExpires || new Date(session.user.banExpires) > new Date())) return null;
  return session;
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
