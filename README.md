# ToolNest Pro

ToolNest Pro is a Next.js catalog for 33 planned tools. Phase 2 adds accounts and sessions. The admin area is reserved for Phase 3.

## Run locally

Use Node.js 20.19 or newer and install the locked dependencies with `npm ci`. Copy `.env.example` to `.env.local`, fill in the values below, and run `npm run dev`. Open `http://localhost:3000` using the same hostname as `BETTER_AUTH_URL`.

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string with the target database in its path, such as `toolnest_pro`. |
| `BETTER_AUTH_SECRET` | Stable random secret. Generate one with `openssl rand -base64 32`. Use the same value across instances of a deployment. |
| `BETTER_AUTH_URL` | Canonical app origin, such as `http://localhost:3000` or `https://your-domain.com`. Use HTTPS on public deployments. |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret. |

Keep both Google variables empty to run email/password auth without Google. Set both to enable Google. Store production values in the hosting platform’s server-side environment configuration.

### MongoDB Atlas

1. Create an Atlas cluster. Under **Database Access**, create an application database user with read/write access to the target database, including permission to create indexes.
2. Under **Network Access**, allow the application’s outbound IP or use the cluster’s configured private connectivity.
3. Open the cluster’s **Connect → Drivers** panel, choose **Node.js**, and copy the URI. Fill in the credentials and database name. Percent-encode reserved characters in the username and password.
4. Set `MONGODB_URI` and restart the app. The adapter creates its required indexes. For local database testing, use a MongoDB replica set so transactions are available.

### Google OAuth

1. Select or create a project in Google Cloud Console and open **Google Auth Platform**.
2. Under **Branding**, configure the app name, user support email, and developer contact. Set the homepage, privacy policy, and authorized domains as required for production.
3. Under **Audience**, select **Internal** for an eligible Workspace-only app, or **External** for broader access. For an external app in **Testing**, add the Google accounts used to verify sign-in under **Test users**.
4. Under **Data Access**, use the standard OpenID Connect identity scopes `openid`, `email`, and `profile`.
5. Under **Clients**, choose **Create client → Web application**. Add the exact addresses below under **Authorized redirect URIs**, replacing the production hostname with the deployed origin. This flow sends OAuth requests through Better Auth’s server.
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Copy the client ID and client secret into the server environment and restart. Open `/login` or `/register`, choose **Continue with Google**, and confirm that a configured Google user reaches `/dashboard`. Repeat after sign-out and verify that canceling consent returns to the account page.

See the [Google Cloud OAuth setup guide](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid) and the [Better Auth Google provider guide](https://better-auth.com/docs/authentication/google).

### Production deployment

Use the canonical HTTPS origin for all auth traffic. If a reverse proxy fronts the app, configure it to overwrite `X-Forwarded-For` with the trusted client address and restrict access to the origin. Better Auth uses that header for per-IP rate limits. Run the checks below before deploying.

Google and email/password accounts cannot be implicitly linked. If an email is already registered, use the sign-in method used to create the account.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
```
