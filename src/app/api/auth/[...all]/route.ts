import { toNextJsHandler } from "better-auth/next-js";
import { getReadyAuth } from "@/lib/auth";

export const runtime = "nodejs";

function unavailable() {
  return Response.json({ code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable." }, { status: 503 });
}

async function handle(request: Request) {
  let auth: Awaited<ReturnType<typeof getReadyAuth>>;
  try {
    auth = await getReadyAuth();
  } catch (error) {
    console.error("Could not initialize authentication storage", error instanceof Error ? error.name : "Unknown error");
    return unavailable();
  }

  if (!auth) return unavailable();

  const { GET, POST } = toNextJsHandler(auth);
  return request.method === "GET" ? GET(request) : POST(request);
}

export { handle as GET, handle as POST };
