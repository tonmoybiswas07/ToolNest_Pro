"use client";

export function sendAnalytics(event: Record<string, unknown>) {
  return fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  });
}
