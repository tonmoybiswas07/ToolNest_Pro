import "server-only";

import { type Document, ObjectId } from "mongodb";
import { z } from "zod";
import { applicationMongo } from "@/lib/mongodb";
import { analyticsIndexes, expiry, settings, userObjectId, type Settings } from "@/features/analytics/store";

const userProjection = { name: 1, email: 1, image: 1, role: 1, banned: 1, banExpires: 1, createdAt: 1 };
export const userQuery = z.object({
  q: z.string().trim().max(100).catch(""),
  role: z.enum(["all", "user", "admin"]).catch("all"),
  status: z.enum(["all", "active", "suspended"]).catch("all"),
  order: z.enum(["newest", "oldest"]).catch("newest"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

const pageSize = 20;
const suspended = { banned: true, $or: [{ banExpires: null }, { banExpires: { $gt: new Date() } }] };

function serializeUser(row: Document) {
  return {
    id: String(row._id), name: String(row.name), email: String(row.email),
    image: typeof row.image === "string" ? row.image : null,
    role: row.role === "admin" ? "admin" as const : "user" as const,
    suspended: row.banned === true && (!row.banExpires || row.banExpires > new Date()),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
    lastLogin: row.lastLogin instanceof Date ? row.lastLogin.toISOString() : null,
    providers: (row.providers as string[])?.filter(provider => ["credential", "google"].includes(provider)) ?? [],
  };
}

function userSummary() {
  return [
    { $project: userProjection },
    { $lookup: {
      from: "account", localField: "_id", foreignField: "userId",
      pipeline: [{ $project: { _id: 0, providerId: 1 } }], as: "accounts",
    } },
    { $lookup: {
      from: "activity_events", let: { userId: { $toString: "$_id" } },
      pipeline: [
        { $match: { type: "login", $expr: { $eq: ["$userId", "$$userId"] } } },
        { $sort: { at: -1 } }, { $limit: 1 }, { $project: { _id: 0, at: 1 } },
      ], as: "logins",
    } },
    { $set: { providers: "$accounts.providerId", lastLogin: { $first: "$logins.at" } } },
    { $unset: ["accounts", "logins"] },
  ];
}

export async function users(raw: Record<string, unknown>) {
  await analyticsIndexes();
  const input = userQuery.parse(raw);
  const match: Document = {};
  const filters: Document[] = [];
  if (input.q) {
    const pattern = input.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filters.push({ $or: [{ name: { $regex: pattern, $options: "i" } }, { email: { $regex: pattern, $options: "i" } }] });
  }
  if (input.role !== "all") filters.push(input.role === "admin" ? { role: "admin" } : { role: { $in: ["user", null] } });
  if (input.status !== "all") filters.push(input.status === "suspended" ? suspended : { $nor: [suspended] });
  if (filters.length) match.$and = filters;
  const collection = applicationMongo().db.collection("user");
  const sort = input.order === "oldest" ? 1 : -1;
  const [rows, count] = await Promise.all([
    collection.aggregate([{ $match: match }, { $sort: { createdAt: sort, _id: sort } }, { $skip: (input.page - 1) * pageSize }, { $limit: pageSize }, ...userSummary()]).toArray(),
    collection.countDocuments(match),
  ]);
  return { rows: rows.map(serializeUser), count, pages: Math.max(1, Math.ceil(count / pageSize)), input };
}

export async function userDetails(id: string) {
  const objectId = userObjectId(id);
  if (!objectId) return null;
  await analyticsIndexes();
  const [row] = await applicationMongo().db.collection("user").aggregate([{ $match: { _id: objectId } }, ...userSummary()]).toArray();
  return row ? serializeUser(row) : null;
}

export const settingsSchema = z.strictObject({
  retentionDays: z.number().int().min(7).max(90),
  searchEnabled: z.boolean(),
  activityEnabled: z.boolean(),
  dashboardDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
});

export const mutationSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.enum(["suspend", "reactivate"]), id: z.string().regex(/^[a-f\d]{24}$/i) }),
  z.strictObject({ action: z.literal("settings"), settings: settingsSchema }),
]);

export async function adminMutation(actor: string, input: z.infer<typeof mutationSchema>) {
  const actorObject = userObjectId(actor);
  if (!actorObject) return 403;
  const { db, client } = applicationMongo();
  const config = await settings();
  await analyticsIndexes();
  const store = db.collection<{ _id: string; revision?: number } & Partial<Settings>>("admin_settings");
  await store.updateOne({ _id: "role-guard" }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  const audit = db.collection("admin_audit_logs");

  return client.withSession(session => session.withTransaction(async () => {
    await store.updateOne({ _id: "role-guard" }, { $inc: { revision: 1 } }, { session });
    const actorRow = await db.collection("user").findOne({ _id: actorObject, role: "admin", $nor: [suspended] }, { projection: { _id: 1 }, session });
    if (!actorRow) return 403;
    if (await audit.countDocuments({ actorId: actor, at: { $gte: new Date(Date.now() - 60000) } }, { limit: 15, session }) >= 15) return 429;

    let targetId = "settings";
    let summary: string | string[] = "Updated dashboard settings";
    const at = new Date();

    if (input.action === "settings") {
      const current = await store.findOne({ _id: "settings" }, { session });
      summary = (Object.keys(input.settings) as (keyof Settings)[]).filter(key => input.settings[key] !== (current?.[key] ?? config[key]));
      if (summary.length === 0) return 200;
      await store.updateOne({ _id: "settings" }, { $set: input.settings }, { upsert: true, session });
    } else {
      const id = new ObjectId(input.id);
      const target = await db.collection("user").findOne({ _id: id }, { projection: { role: 1, banned: 1, banExpires: 1 }, session });
      if (!target) return 404;
      if (id.equals(actorObject) || target.role === "admin") return 403;
      const banned = input.action === "suspend";
      const currentlyBanned = target.banned === true && (!target.banExpires || target.banExpires > at);
      if (currentlyBanned === banned) return 200;
      await db.collection("user").updateOne({ _id: id }, { $set: { banned, banReason: null, banExpires: null, updatedAt: at } }, { session });
      if (banned) await db.collection("session").deleteMany({ userId: id }, { session });
      targetId = input.id;
      summary = banned ? "Account suspended and sessions revoked" : "Account reactivated";
      if (config.activityEnabled) await db.collection("activity_events").insertOne({
        type: banned ? "suspension" : "reactivation", userId: input.id, success: true, at, expiresAt: expiry(config.retentionDays),
      }, { session });
    }

    await audit.insertOne({ actorId: actor, action: input.action, targetId, at, summary, outcome: "success" }, { session });
    return 200;
  }));
}

export async function eventPage(name: "activity_events" | "admin_audit_logs", rawPage: unknown) {
  const page = userQuery.shape.page.parse(rawPage);
  await analyticsIndexes();
  const collection = applicationMongo().db.collection(name);
  const [rows, count] = await Promise.all([
    collection.find({}, { projection: { at: 1, type: 1, userId: 1, provider: 1, success: 1, action: 1, actorId: 1, targetId: 1, outcome: 1, summary: 1 } })
      .sort({ at: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(),
  ]);
  return { rows, page, pages: Math.max(1, Math.ceil(count / pageSize)) };
}
