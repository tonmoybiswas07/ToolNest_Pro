import { z } from "zod";
import { socialPostUrl } from "@/features/social/platforms";
import { getSession } from "@/lib/session";

const input = z.object({
  platform: z.enum(["instagram", "tiktok", "threads"]),
  url: z.string().max(1000),
});
const providerOutput = z.object({ downloadUrl: z.url().max(4096) });
const requests = new Map<string, { count: number; expires: number }>();

function limited(userId: string) {
  const now = Date.now();
  for (const [key, request] of requests) {
    if (request.expires <= now) requests.delete(key);
  }
  const request = requests.get(userId) ?? { count: 0, expires: now + 60_000 };
  if (request.count >= 5 || (!requests.has(userId) && requests.size >= 1000)) return true;
  request.count++;
  requests.set(userId, request);
  return false;
}

function reply(data: { error: string } | { downloadUrl: string }, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = process.env.BETTER_AUTH_URL;
  if (!origin || request.headers.get("origin") !== new URL(origin).origin) {
    return reply({ error: "Invalid request origin." }, 403);
  }
  const session = await getSession();
  if (!session) return reply({ error: "Sign in to use this tool." }, 401);

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ error: "Enter a valid video post URL." }, 400);
  const { platform } = parsed.data;
  const url = socialPostUrl(platform, parsed.data.url);
  if (!url) return reply({ error: "Enter a valid video post URL for this platform." }, 400);

  const endpoint = process.env.SOCIAL_DOWNLOAD_PROVIDER_URL;
  if (!endpoint) return reply({ error: "The download provider is unavailable. Try the platform’s download options below." }, 503);
  if (limited(session.user.id)) return reply({ error: "Too many requests. Try again in a minute." }, 429);

  try {
    const provider = new URL(endpoint);
    if (provider.protocol !== "https:" || provider.username || provider.password) throw new Error();
    const token = process.env.SOCIAL_DOWNLOAD_PROVIDER_TOKEN;
    const response = await fetch(provider, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ platform, url }),
    });
    if (response.status === 404 || response.status === 422) {
      return reply({ error: "This post has no downloadable video or is unavailable." }, 422);
    }
    if (!response.ok) throw new Error();
    const { downloadUrl } = providerOutput.parse(await response.json());
    const link = new URL(downloadUrl);
    if (link.protocol !== "https:" || link.username || link.password) throw new Error();
    return reply({ downloadUrl: link.href }, 200);
  } catch {
    return reply({ error: "Could not get a download link. Try again or use the platform’s download options." }, 502);
  }
}
