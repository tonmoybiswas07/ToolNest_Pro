import "server-only";

import { applicationMongo } from "@/lib/mongodb";
import { canonicalToolSlug, findTool } from "@/features/tools/registry";

type Preferences = { _id: string; consent?: boolean; favorites?: string[]; revision?: number };

export function preferences() {
  return applicationMongo().db.collection<Preferences>("admin_settings");
}

function resolve(slugs: string[]) {
  return [...new Set(slugs.map(canonicalToolSlug))].flatMap(slug => findTool(slug) ?? []);
}

export async function recentTools(userId: string) {
  const recent = await applicationMongo().db.collection("tool_usage_events").aggregate([
    { $match: { userId, type: { $in: ["opened", "executed", "failed"] }, expiresAt: { $gt: new Date() } } },
    { $group: { _id: "$slug", last: { $max: "$at" } } },
    { $sort: { last: -1, _id: 1 } },
    { $limit: 24 },
  ]).toArray();
  return resolve(recent.map(row => String(row._id))).slice(0, 8);
}

export async function personalAnalytics(userId: string) {
  const db = applicationMongo().db;
  const [prefs, recent, searches, executionCount] = await Promise.all([
    preferences().findOne({ _id: `user:${userId}` }),
    recentTools(userId),
    db.collection("search_analytics").find({ userId, expiresAt: { $gt: new Date() } }, { projection: { keyword: 1, at: 1 } }).sort({ at: -1 }).limit(15).toArray(),
    db.collection("tool_usage_events").countDocuments({ userId, type: "executed", expiresAt: { $gt: new Date() } }),
  ]);
  return {
    consent: prefs?.consent === true,
    favorites: resolve(prefs?.favorites ?? []),
    recent,
    searches,
    executionCount,
  };
}
