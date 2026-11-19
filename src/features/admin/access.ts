import "server-only";

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") notFound();
  return session.user;
}

export function sameOrigin(request: Request) {
  const origin = process.env.BETTER_AUTH_URL;
  return Boolean(origin && request.headers.get("origin") === new URL(origin).origin);
}
