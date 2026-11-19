import "server-only";

import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { recordActivity } from "@/features/analytics/store";
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

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function googleAuthEnabled() {
  return Boolean(getGoogleConfig());
}

async function createAuth(config: z.output<typeof configSchema>) {
  const client = getMongoClient(config.MONGODB_URI);
  const db = client.db();
  await ensureAuthIndexes(db);

  const google = getGoogleConfig();
  const baseURL = config.BETTER_AUTH_URL.origin;

  const adminPlugin = admin({ defaultRole: "user", adminRoles: ["admin"] });

  return betterAuth({
    plugins: [adminPlugin],
    disabledPaths: Object.values(adminPlugin.endpoints).map(endpoint => endpoint.path).filter(path => path !== undefined),
    databaseHooks: {
      user: {
        create: { after: async (user, context) => {
          const provider = context?.path === "/sign-up/email" ? "credential" : context?.params?.id === "google" ? "google" : undefined;
          await recordActivity("registration", user.id, provider);
        } },
      },
    },
    hooks: {
      after: createAuthMiddleware(async ctx => {
        const provider = ctx.path === "/sign-in/email" ? "credential" : ctx.path === "/callback/:id" && ctx.params?.id === "google" ? "google" : undefined;
        const newSession = ctx.context.newSession;
        if (provider && newSession) await recordActivity("login", newSession.user.id, provider);
      }),
    },
    appName: "ToolNest Pro",
    baseURL,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    database: mongodbAdapter(db, { client }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
    socialProviders: google ? { google: { ...google, prompt: "select_account" } } : {},
    logger: {
      level: "warn",
      log: (level) => {
        if (level === "error") console.error("Better Auth reported an error.");
        if (level === "warn") console.warn("Better Auth reported a warning.");
      },
    },
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
  if (!config.success) {
    console.warn("Invalid authentication environment variables", config.error.issues.map((issue) => issue.path[0]));
    return null;
  }

  auth = createAuth(config.data).catch((error: unknown) => {
    auth = undefined;
    throw error;
  });
  return auth;
}
