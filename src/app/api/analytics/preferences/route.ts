import { preferences } from "@/features/analytics/personal";
import { canonicalToolSlug } from "@/features/tools/registry";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new Response(null, { status: 401 });
    const row = await preferences().findOne({ _id: `user:${session.user.id}` }, { projection: { favorites: 1, consent: 1 } });
    return Response.json({ favorites: [...new Set((row?.favorites ?? []).map(canonicalToolSlug))], consent: row?.consent === true });
  } catch {
    return new Response(null, { status: 503 });
  }
}
