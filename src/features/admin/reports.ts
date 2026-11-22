import "server-only";

import type { Document } from "mongodb";
import { applicationMongo } from "@/lib/mongodb";
import { analyticsIndexes } from "@/features/analytics/store";
import { categories, findTool, legacyToolRoutes, tools, type CategoryId } from "@/features/tools/registry";

const day = 86400000;
export const dateRanges = [7, 30, 90] as const;

export function rangeDays(raw: unknown, fallback = 30) {
  return dateRanges.find(value => String(value) === raw) ?? fallback;
}

export async function reports(days: number) {
  await analyticsIndexes();
  const db = applicationMongo().db;
  const now = new Date();
  const today = new Date(now.toISOString().slice(0, 10));
  const start = new Date(+today - (days - 1) * day);
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const date = (field: string) => ({ $dateToString: { date: field, format: "%Y-%m-%d", timezone: "UTC" } });
  const calendar = Array.from({ length: days }, (_, index) => new Date(+start + index * day).toISOString().slice(0, 10));
  const live = { at: { $gte: start }, expiresAt: { $gt: now } };
  const users = db.collection("user");
  const [total, todayCount, monthCount, growth, log, usage, search] = await Promise.all([
    users.countDocuments(),
    users.countDocuments({ createdAt: { $gte: today } }),
    users.countDocuments({ createdAt: { $gte: month } }),
    users.aggregate([{ $match: { createdAt: { $gte: start } } }, { $group: { _id: date("$createdAt"), count: { $sum: 1 } } }]).toArray(),
    db.collection("activity_events").aggregate([
      { $match: { ...live, type: { $in: ["login", "login_failed", "registration", "logout"] } } },
      {
        $facet: {
          logins: [{ $match: { type: { $in: ["login", "login_failed"] } } }, {
            $group: {
              _id: date("$at"), successful: { $sum: { $cond: [{ $eq: ["$type", "login"] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$type", "login_failed"] }, 1, 0] } },
            }
          }],
        }
      },
    ]).next(),
    db.collection("tool_usage_events").aggregate([
      { $match: live },
      { $set: { slug: { $switch: { branches: [...legacyToolRoutes].map(([old, target]) => ({ case: { $eq: ["$slug", old] }, then: target.slug })), default: "$slug" } } } },
      {
        $facet: {
          executions: [{ $match: { type: { $in: ["executed", "failed"] } } }, {
            $group: {
              _id: "$slug", executions: { $sum: { $cond: [{ $eq: ["$type", "executed"] }, 1, 0] } },
              errors: { $sum: { $cond: [{ $eq: ["$type", "failed"] }, 1, 0] } },
            }
          }],
          distinct: [{ $match: { type: "executed", userId: { $type: "string" } } }, { $group: { _id: { slug: "$slug", userId: "$userId" } } }, { $group: { _id: "$_id.slug", count: { $sum: 1 } } }],
          overallUsers: [{ $match: { type: "executed", userId: { $type: "string" } } }, { $group: { _id: "$userId" } }, { $count: "count" }],
          trend: [{ $match: { type: "executed" } }, { $group: { _id: date("$at"), count: { $sum: 1 } } }],
        }
      },
    ]).next(),
    db.collection("search_analytics").aggregate([
      { $match: live },
      {
        $facet: {
          trend: [{
            $group: {
              _id: date("$at"), count: { $sum: 1 },
              zero: { $sum: { $cond: ["$zero", 1, 0] } }, converted: { $sum: { $cond: ["$converted", 1, 0] } },
            }
          }],
          terms: [{ $match: { keyword: { $type: "string" } } }, { $group: { _id: "$keyword", count: { $sum: 1 } } },
          { $match: { count: { $gte: 5 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 15 }],
        }
      },
    ]).next(),
  ]);

  const lookup = (rows: Document[] = [], value: string) => new Map(rows.map(row => [row._id, Number(row[value])]));
  const registrations = lookup(growth, "count");
  const successful = lookup(log?.logins, "successful");
  const failures = lookup(log?.logins, "failed");
  const activity = await db.collection("activity_events").aggregate([
    { $match: { ...live, type: { $in: ["registration", "login", "logout"] }, userId: { $type: "string" } } },
    { $project: { userId: 1, day: date("$at") } },
    {
      $unionWith: {
        coll: "tool_usage_events", pipeline: [
          { $match: { ...live, userId: { $type: "string" } } }, { $project: { userId: 1, day: date("$at") } },
        ]
      }
    },
    { $group: { _id: { day: "$day", userId: "$userId" } } }, { $group: { _id: "$_id.day", count: { $sum: 1 } } },
  ]).toArray();
  const active = lookup(activity, "count");
  const searchCount = lookup(search?.trend, "count");
  const zeroCount = lookup(search?.trend, "zero");
  const conversions = lookup(search?.trend, "converted");
  const executions = lookup(usage?.executions, "executions");
  const errors = lookup(usage?.executions, "errors");
  const distinct = lookup(usage?.distinct, "count");
  const usageTrend = lookup(usage?.trend, "count");
  const series = (values: Map<unknown, number>) => calendar.map(label => ({ label, value: values.get(label) ?? 0 }));
  const sum = (values: Map<unknown, number>) => [...values.values()].reduce((acc, value) => acc + value, 0);
  const reportingTools = tools.map(tool => ({ ...tool, category: categories[tool.category].name }));
  const toolRows = reportingTools.map(tool => ({
    slug: tool.slug, name: tool.name, category: tool.category,
    executions: executions.get(tool.slug) ?? 0, errors: errors.get(tool.slug) ?? 0, unique: distinct.get(tool.slug) ?? 0,
  })).sort((a, b) => b.executions - a.executions || a.name.localeCompare(b.name));
  const categoryRows = [...Object.values(categories), { name: "Social Media" }].map(category => ({
    label: category.name, value: toolRows.filter(row => row.category === category.name).reduce((count, row) => count + row.executions, 0),
  }));

  return {
    stats: { total, todayCount, monthCount, active: active.get(today.toISOString().slice(0, 10)) ?? 0, successful: sum(successful), failures: sum(failures), executions: sum(executions), searches: sum(searchCount) },
    growth: series(registrations), successful: series(successful), failures: series(failures), active: series(active),
    searches: series(searchCount), zero: sum(zeroCount), converted: sum(conversions),
    terms: (search?.terms as Document[] | undefined ?? []).map(row => ({
      label: findTool(String(row._id))?.name ?? (row._id === "social" ? "Social Media" : undefined) ?? (Object.hasOwn(categories, row._id) ? categories[row._id as CategoryId].name : "Unknown"),
      value: Number(row.count),
    })),
    toolRows, categoryRows, usageTrend: series(usageTrend), unique: Number(usage?.overallUsers[0]?.count ?? 0),
  };
}
