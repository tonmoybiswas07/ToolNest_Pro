import "server-only";

import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth/minimal";
import { z } from "zod";
import { ensureAuthIndexes, getMongoClient } from "@/lib/mongodb";

const configSchema = z.object({
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).transform((value) => new URL(value))
    .refine((url) => url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password
      && (url.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))),
});

export function googleAuthEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function createAuth(config: z.output<typeof configSchema>) {
  const client = getMongoClient(config.MONGODB_URI);
  const baseURL = config.BETTER_AUTH_URL.origin;

  return betterAuth({
    appName: "ToolNest Pro",
    baseURL,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    database: mongodbAdapter(client.db(), { client }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
    socialProviders: googleAuthEnabled() ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        prompt: "select_account",
      },
    } : {},
    account: {
      accountLinking: { enabled: false },
      encryptOAuthTokens: true,
    },
    advanced: { useSecureCookies: config.BETTER_AUTH_URL.protocol === "https:" },
    session: { cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database" },
    onAPIError: { errorURL: `${baseURL}/login` },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (auth) return auth;

  const config = configSchema.safeParse(process.env);
  if (!config.success || Boolean(process.env.GOOGLE_CLIENT_ID) !== Boolean(process.env.GOOGLE_CLIENT_SECRET)) {
    return null;
  }

  auth = createAuth(config.data);
  return auth;
}

export async function getReadyAuth() {
  const instance = getAuth();
  if (instance) await ensureAuthIndexes(getMongoClient(process.env.MONGODB_URI!));
  return instance;
}
