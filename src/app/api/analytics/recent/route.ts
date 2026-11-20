import { recentTools } from "@/features/analytics/personal";
import { getSession } from "@/lib/session";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new Response(null, { status: 401, headers });

    const tools = await recentTools(session.user.id);
    return Response.json({ slugs: tools.slice(0, 4).map(tool => tool.slug) }, { headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
