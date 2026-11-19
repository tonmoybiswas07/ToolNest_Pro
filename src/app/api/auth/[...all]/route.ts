import { toNextJsHandler } from "better-auth/next-js";
import { recordActivity } from "@/features/analytics/store";
import { getSession } from "@/lib/session";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

function unavailable() {
  return Response.json({ code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable." }, { status: 503 });
}

async function handle(request: Request) {
  let auth: Awaited<ReturnType<typeof getAuth>>;
  try {
    auth = await getAuth();
  } catch (error) {
    console.error("Could not initialize authentication storage", error instanceof Error ? error.name : "Unknown error");
    return unavailable();
  }

  if (!auth) return unavailable();

  const { GET, POST } = toNextJsHandler(auth);
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  const session = path === "/api/auth/sign-out" ? await getSession() : null;
  const response = await (request.method === "GET" ? GET(request) : POST(request));
  if (session && response.ok) await recordActivity("logout", session.user.id);
  if (path === "/api/auth/sign-in/email" && response.status === 401) {
    await recordActivity("login_failed", undefined, "credential");
  }
  return response;
}

export { handle as GET, handle as POST };
