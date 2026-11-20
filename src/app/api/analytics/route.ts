import { createHash } from "node:crypto";
import { z } from "zod";
import { sameOrigin } from "@/features/admin/access";
import { analyticsIndexes, expiry, settings } from "@/features/analytics/store";
import { preferences } from "@/features/analytics/personal";
import { categories, legacyToolRoutes, tools } from "@/features/tools/registry";
import { applicationMongo } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

const slug = z.string().max(100).refine(value => tools.some(tool => tool.slug === value));
const keyword = z.string().max(100).refine(value => tools.some(tool => tool.slug === value) || Object.hasOwn(categories, value));
const schema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("search"), id: z.uuid(), keyword: keyword.optional(), zero: z.boolean() }),
  z.strictObject({ type: z.literal("opened"), id: z.uuid(), slug, searchId: z.uuid().optional() }),
  z.strictObject({ type: z.enum(["executed", "failed"]), id: z.uuid(), slug: slug.refine(value => tools.some(tool => tool.slug === value && (tool.status === "Available" || tool.slug === "ai-notes-summarizer"))) }),
  z.strictObject({ type: z.literal("favorite"), slug, enabled: z.boolean() }),
  z.strictObject({ type: z.literal("consent"), enabled: z.boolean() }),
  z.strictObject({ type: z.literal("delete_history") }),
]);

const limits = new Map<string, number>();
let windowStart = 0;

function rateLimited(key: string, max: number) {
  const now = Date.now();
  if (now - windowStart >= 60000) {
    limits.clear();
    windowStart = now;
  }
  const count = limits.get(key) ?? 0;
  if (count >= max || (!count && limits.size >= 5000)) return true;
  limits.set(key, count + 1);
  return false;
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return new Response(null, { status: 403 });
    const raw = await request.text();
    if (raw.length > 2048) return new Response(null, { status: 413 });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return new Response(null, { status: 400 });

    const event = parsed.data;
    const session = await getSession();
    const userId = session?.user.id;
    if (!userId && event.type !== "search" && event.type !== "opened" && event.type !== "executed" && event.type !== "failed") return new Response(null, { status: 401 });
    if (rateLimited(userId ?? "anonymous", userId ? 35 : 180)) return new Response(null, { status: 429 });

    const { client, db } = applicationMongo();
    const config = await settings();
    await analyticsIndexes();
    const at = new Date();
    const expiresAt = expiry(config.retentionDays);
    const searches = db.collection<{ _id: string; at: Date; userId?: string; converted?: boolean }>("search_analytics");
    const usage = db.collection<{ _id: string }>("tool_usage_events");

    if (event.type === "search" && config.searchEnabled) {
      const row = { at, expiresAt, keyword: event.keyword, zero: event.zero, converted: false };
      if (userId && event.keyword) {
        await client.withSession(transaction => transaction.withTransaction(async () => {
          const pref = await preferences().findOneAndUpdate(
            { _id: `user:${userId}`, consent: true }, { $inc: { revision: 1 } }, { session: transaction },
          );
          await searches.updateOne({ _id: event.id }, { $setOnInsert: { ...row, ...(pref ? { userId } : {}) } }, { upsert: true, session: transaction });
        }));
      } else {
        await searches.updateOne({ _id: event.id }, { $setOnInsert: row }, { upsert: true });
      }
    } else if (event.type === "opened") {
      const id = userId ? createHash("sha256").update(`${userId}:${event.slug}:${Math.floor(Date.now() / 30000)}`).digest("hex") : event.id;
      await usage.updateOne({ _id: id }, { $setOnInsert: { slug: event.slug, type: "opened", ...(userId ? { userId } : {}), at, expiresAt } }, { upsert: true });
      if (config.searchEnabled && event.searchId) {
        await searches.updateOne({ _id: event.searchId, at: { $gte: new Date(Date.now() - 600000) }, zero: false }, { $set: { converted: true } });
      }
    } else if (event.type === "executed" || event.type === "failed") {
      const id = createHash("sha256").update(`execution:${userId ?? "anonymous"}:${event.id}`).digest("hex");
      await usage.updateOne({ _id: id }, { $setOnInsert: { slug: event.slug, type: event.type, ...(userId ? { userId } : {}), at, expiresAt } }, { upsert: true });
    } else if (event.type === "favorite" && userId) {
      const _id = `user:${userId}`;
      await client.withSession(transaction => transaction.withTransaction(async () => {
        const aliases = [...legacyToolRoutes].filter(([, target]) => target.slug === event.slug).map(([key]) => key);
        const operation = event.enabled ? { $addToSet: { favorites: event.slug } } : { $pull: { favorites: { $in: [event.slug, ...aliases] } } };
        const changed = await preferences().updateOne({ _id }, operation, { upsert: event.enabled, session: transaction });
        if (changed.modifiedCount || changed.upsertedCount) await db.collection("tool_usage_events").insertOne({
          slug: event.slug, type: event.enabled ? "favorite_added" : "favorite_removed", userId, at, expiresAt,
        }, { session: transaction });
      }));
    } else if (event.type === "consent" && userId) {
      await preferences().updateOne({ _id: `user:${userId}` }, { $set: { consent: event.enabled } }, { upsert: true });
    } else if (event.type === "delete_history" && userId) {
      await client.withSession(transaction => transaction.withTransaction(async () => {
        await preferences().updateOne({ _id: `user:${userId}` }, { $set: { consent: false } }, { upsert: true, session: transaction });
        await searches.updateMany({ userId }, { $unset: { userId: "" } }, { session: transaction });
      }));
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(null, { status: error instanceof SyntaxError ? 400 : 503 });
  }
}
