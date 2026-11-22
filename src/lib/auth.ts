import "server-only";

import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { eraseAccountData } from "@/features/auth/account-data";
import { profileImageUrl } from "@/features/auth/profile-image";
import { sendVerificationMail, verificationEmailEnabled } from "@/features/auth/verification-mail";
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
  const emailEnabled = verificationEmailEnabled();
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
      before: createAuthMiddleware(async ctx => {
        if (ctx.path === "/update-user" || ctx.path === "/sign-up/email") {
          const { name, image } = ctx.body ?? {};
          if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 100)) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "Enter a name of 1 to 100 characters." });
          }
          if (image !== undefined && image !== null && (typeof image !== "string" || !profileImageUrl(image))) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "Choose a supported profile photo." });
          }
          if (typeof name === "string") ctx.body.name = name.trim();
        }
        if (ctx.path === "/send-verification-email" && !await getSessionFromCtx(ctx)) {
          throw APIError.fromStatus("UNAUTHORIZED");
        }
        if (ctx.path === "/delete-user") {
          const session = await getSessionFromCtx(ctx);
          if (!session) return;
          if (session.user.role === "admin") {
            throw APIError.fromStatus("FORBIDDEN", { message: "Remove the administrator role before deleting this account." });
          }
          if (ctx.body?.password) return;
          const credential = await ctx.context.internalAdapter.findCredentialAccount(session.user.id);
          if (credential?.password) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "Enter your current password." });
          }
          if (Date.now() - new Date(session.session.createdAt).getTime() >= 5 * 60_000) {
            throw APIError.fromStatus("FORBIDDEN", {
              code: "SESSION_NOT_FRESH",
              message: "Sign out and sign in again to confirm this request.",
            });
          }
        }
      }),
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
    emailVerification: emailEnabled ? {
      expiresIn: 3600,
      sendOnSignUp: true,
      sendVerificationEmail: sendVerificationMail,
    } : undefined,
    user: { deleteUser: { enabled: true, beforeDelete: async user => eraseAccountData(user.id) } },
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
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/send-verification-email": { window: 60, max: 3 } },
    },
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
