export function siteUrl() {
  return new URL(process.env.SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").origin;
}
