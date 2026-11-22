"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Field,
  Notice,
  Panel,
} from "./shared";

const HTTP_CODES = [
  { code: 100, name: "Continue", category: "1xx Informational", desc: "The server has received the request headers and the client should proceed to send the request body." },
  { code: 101, name: "Switching Protocols", category: "1xx Informational", desc: "The server is switching protocols as requested by the client." },
  { code: 200, name: "OK", category: "2xx Success", desc: "The request was successful." },
  { code: 201, name: "Created", category: "2xx Success", desc: "The request was fulfilled and a new resource was created." },
  { code: 204, name: "No Content", category: "2xx Success", desc: "The request was successful but there is no content to return." },
  { code: 301, name: "Moved Permanently", category: "3xx Redirection", desc: "The resource has permanently moved to a new URL." },
  { code: 302, name: "Found", category: "3xx Redirection", desc: "The resource temporarily resides at a different URL." },
  { code: 304, name: "Not Modified", category: "3xx Redirection", desc: "The resource has not been modified since last requested." },
  { code: 307, name: "Temporary Redirect", category: "3xx Redirection", desc: "The resource is temporarily at a different URL; use same HTTP method." },
  { code: 308, name: "Permanent Redirect", category: "3xx Redirection", desc: "The resource is permanently at a different URL; use same HTTP method." },
  { code: 400, name: "Bad Request", category: "4xx Client Error", desc: "The server could not understand the request due to invalid syntax." },
  { code: 401, name: "Unauthorized", category: "4xx Client Error", desc: "Authentication is required to access this resource." },
  { code: 403, name: "Forbidden", category: "4xx Client Error", desc: "You don't have permission to access this resource." },
  { code: 404, name: "Not Found", category: "4xx Client Error", desc: "The requested resource could not be found." },
  { code: 405, name: "Method Not Allowed", category: "4xx Client Error", desc: "The HTTP method is not allowed for this resource." },
  { code: 408, name: "Request Timeout", category: "4xx Client Error", desc: "The server timed out waiting for the request." },
  { code: 409, name: "Conflict", category: "4xx Client Error", desc: "The request conflicts with the current state of the resource." },
  { code: 410, name: "Gone", category: "4xx Client Error", desc: "The resource is permanently unavailable." },
  { code: 413, name: "Payload Too Large", category: "4xx Client Error", desc: "The request entity is larger than the server is willing to process." },
  { code: 415, name: "Unsupported Media Type", category: "4xx Client Error", desc: "The media format is not supported by the server." },
  { code: 422, name: "Unprocessable Entity", category: "4xx Client Error", desc: "The request was well-formed but had semantic errors." },
  { code: 429, name: "Too Many Requests", category: "4xx Client Error", desc: "The user has sent too many requests in a given amount of time (rate limiting)." },
  { code: 500, name: "Internal Server Error", category: "5xx Server Error", desc: "The server encountered an unexpected condition." },
  { code: 501, name: "Not Implemented", category: "5xx Server Error", desc: "The server does not support the request method." },
  { code: 502, name: "Bad Gateway", category: "5xx Server Error", desc: "The server received an invalid response from an upstream server." },
  { code: 503, name: "Service Unavailable", category: "5xx Server Error", desc: "The server is not ready to handle the request." },
  { code: 504, name: "Gateway Timeout", category: "5xx Server Error", desc: "The upstream server failed to send a response in time." },
];

const categories = Array.from(new Set(HTTP_CODES.map((c) => c.category)));

const categoryColor: Record<string, string> = {
  "1xx Informational": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "2xx Success": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "3xx Redirection": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "4xx Client Error": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "5xx Server Error": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function HttpStatusReference() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = HTTP_CODES.filter((c) => {
    const q = query.toLowerCase();
    const matchQ = !q || String(c.code).includes(q) || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
    const matchCat = category === "All" || c.category === category;
    return matchQ && matchCat;
  });

  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Search & filter">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Search code or name">
            <Input
              type="search"
              placeholder="e.g. 404 or Not Found"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <select
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="All">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>
      <Panel title={`HTTP status codes (${filtered.length})`}>
        {filtered.length === 0 ? (
          <Notice>No matching status codes found.</Notice>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.code} className="flex gap-4 py-3">
                <span className="shrink-0 font-mono text-lg font-bold tabular-nums">{c.code}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium">{c.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryColor[c.category] ?? ""}`}>
                      {c.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
