import { adminMutation, mutationSchema, users } from "@/features/admin/data";
import { sameOrigin } from "@/features/admin/access";
import { getSession } from "@/lib/session";

async function handle(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Administrator access required." }, { status: 403 });
    if (request.method === "GET") return Response.json(await users(Object.fromEntries(new URL(request.url).searchParams)));
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });

    const body = await request.text();
    if (body.length > 4096) return Response.json({ error: "Request is too large." }, { status: 413 });
    const parsed = mutationSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return Response.json({ error: "Invalid action." }, { status: 400 });
    const status = await adminMutation(session.user.id, parsed.data);
    return Response.json(status === 200 ? { ok: true } : { error: status === 429 ? "Too many changes. Try again shortly." : "This action could not be applied." }, { status });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid request." }, { status: 400 });
    return Response.json({ error: "Administration is temporarily unavailable." }, { status: 503 });
  }
}

export { handle as GET, handle as POST };
