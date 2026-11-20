import { findTool, signInOnlyTools, toolHref } from "../tools/registry";

type SearchParams = Record<string, string | string[] | undefined>;

export function toolReturnTarget(value: string | string[] | undefined) {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\\\x00-\x1f\x7f]/.test(value)
  )
    return undefined;
  const match = /^\/(?:student\/)?tools\/([a-z0-9-]+)(?:\?[^#]*)?$/.exec(value);
  if (!match || !signInOnlyTools.has(match[1])) return undefined;
  const tool = findTool(match[1]);
  return tool && value.split("?", 1)[0] === toolHref(tool) ? value : undefined;
}

export function authHref(page: "/login" | "/register", next?: string) {
  return next ? `${page}?next=${encodeURIComponent(next)}` : page;
}

export function toolDestination(path: string, search: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(search)) {
    for (const value of Array.isArray(values)
      ? values
      : values === undefined
        ? []
        : [values]) {
      params.append(key, value);
    }
  }
  return toolReturnTarget(params.size ? `${path}?${params}` : path) ?? path;
}
