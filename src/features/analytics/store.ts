import "server-only";

import { ObjectId } from "mongodb";
import { applicationMongo } from "@/lib/mongodb";

export const defaults = { retentionDays: 30, searchEnabled: true, activityEnabled: true, dashboardDays: 30 } as const;
export type Settings = { retentionDays: number; searchEnabled: boolean; activityEnabled: boolean; dashboardDays: number };
export type ActivityType = "registration" | "login" | "login_failed" | "logout" | "suspension" | "reactivation";
export type ToolEvent = "opened" | "executed" | "failed" | "favorite_added" | "favorite_removed";

export async function settings() {
  const { db } = applicationMongo();
  return { ...defaults, ...await db.collection<Settings & { _id: string }>("admin_settings").findOne({ _id: "settings" }, { projection: { _id: 0 } }) };
}

let indexing: Promise<unknown> | undefined;
export function analyticsIndexes() {
  const { db } = applicationMongo();
  indexing ??= Promise.all([
    ...["activity_events", "tool_usage_events", "search_analytics"].flatMap(name => [
      db.collection(name).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection(name).createIndex({ at: -1 }),
    ]),
    db.collection("activity_events").createIndex({ type: 1, userId: 1, at: -1 }),
    db.collection("tool_usage_events").createIndex({ userId: 1, at: -1 }),
    db.collection("search_analytics").createIndex({ userId: 1, at: -1 }, { sparse: true }),
    db.collection("admin_audit_logs").createIndex({ at: -1 }),
    db.collection("admin_audit_logs").createIndex({ actorId: 1, at: -1 }),
    db.collection("user").createIndex({ createdAt: -1, _id: -1 }),
  ]).catch((error: unknown) => { indexing = undefined; throw error; });
  return indexing;
}

export function expiry(days: number) {
  return new Date(Date.now() + days * 86400000);
}

export async function recordActivity(type: ActivityType, userId?: string, provider?: "google" | "credential") {
  try {
    const config = await settings();
    if (!config.activityEnabled) return;
    await analyticsIndexes();
    await applicationMongo().db.collection("activity_events").insertOne({
      type, userId, provider, success: type !== "login_failed", at: new Date(), expiresAt: expiry(config.retentionDays),
    });
  } catch {
    console.warn("Could not record authentication activity.");
  }
}

export async function recordToolExecution(slug: string, type: "executed" | "failed", userId?: string) {
  try {
    const { tools } = await import("@/features/tools/registry");
    if (!tools.some(tool => tool.slug === slug)) return;
    const config = await settings();
    await analyticsIndexes();
    await applicationMongo().db.collection("tool_usage_events").insertOne({
      slug, type, userId, at: new Date(), expiresAt: expiry(config.retentionDays),
    });
  } catch {
    console.warn("Could not record tool execution.");
  }
}

export function userObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}
