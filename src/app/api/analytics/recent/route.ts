import { preferences, recentTools } from "@/features/analytics/personal";
import { canonicalToolSlug, findTool } from "@/features/tools/registry";
import { getSession } from "@/lib/session";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new Response(null, { status: 401, headers });

    const [tools, row] = await Promise.all([
      recentTools(session.user.id),
      preferences().findOne({ _id: `user:${session.user.id}` }, { projection: { favorites: 1 } }),
    ]);
    const favorites = [...new Set((row?.favorites ?? []).map(canonicalToolSlug))]
      .filter(slug => findTool(slug)?.status === "Available")
      .slice(0, 4);
    return Response.json({ slugs: tools.slice(0, 4).map(tool => tool.slug), favorites }, { headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
