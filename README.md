# ToolNest Pro

ToolNest Pro is a Next.js catalog for 33 planned tools. Phase 2 adds accounts and sessions. Phase 3 adds the role-protected admin dashboard and activity reporting.

## Run locally

Use Node.js 20.19 or newer and install the locked dependencies with `npm ci`. Copy `.env.example` to `.env.local`, fill in the values below, and run `npm run dev`. Open `http://localhost:3000` using the same hostname as `BETTER_AUTH_URL`.

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string with the target database in its path, such as `toolnest_pro`. |
| `BETTER_AUTH_SECRET` | Stable random secret. Generate one with `openssl rand -base64 32`. Use the same value across instances of a deployment. |
| `BETTER_AUTH_URL` | Canonical app origin, such as `http://localhost:3000` or `https://your-domain.com`. Use HTTPS on public deployments. |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret. |

Set both Google variables to enable Google. Email/password remains available if either Google variable is missing. Store production values in the hosting platform’s server-side environment configuration.

### MongoDB Atlas

1. Create an Atlas cluster. Under **Database Access**, create an application database user with read/write access to the target database, including permission to create indexes.
2. Under **Network Access**, allow the application’s outbound IP or use the cluster’s configured private connectivity.
3. Open the cluster’s **Connect → Drivers** panel, choose **Node.js**, and copy the URI. Fill in the credentials and database name. For an existing deployment, preserve its current database. If its URI omits the database name, MongoDB currently selects the default database. Pointing the URI at a new database changes where Better Auth looks up existing accounts and sessions. Percent-encode reserved characters in the username and password.
4. Set `MONGODB_URI` and restart the app. Auth initializes its required unique indexes in the same database the adapter uses. For local database testing, use a MongoDB replica set so transactions are available.

### Google OAuth

1. Select or create a project in Google Cloud Console and open **Google Auth Platform**.
2. Under **Branding**, configure the app name, user support email, and developer contact. Set the homepage, privacy policy, and authorized domains as required for production.
3. Under **Audience**, select **Internal** for an eligible Workspace-only app, or **External** for broader access. For an external app in **Testing**, add the Google accounts used to verify sign-in under **Test users**. Use **Publish app** when ready to leave Testing and complete Google’s production verification requirements if prompted.
4. Under **Data Access**, use the standard OpenID Connect identity scopes `openid`, `email`, and `profile`.
5. Under **Clients**, choose **Create client → Web application**. Add the exact addresses below under **Authorized redirect URIs**, replacing the production hostname with the deployed origin. This flow sends OAuth requests through Better Auth’s server.
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. If you also configure Google’s browser SDK, add `http://localhost` and `http://localhost:3000` under **Authorized JavaScript origins** for local development and your exact HTTPS production origin for production. Better Auth’s server-side redirect flow requires the redirect URI. If you change the local port, update `BETTER_AUTH_URL` and the corresponding origin and callback entries in Google Cloud, then restart Next.js.
7. Copy the client ID and client secret into the server environment and restart. Open `/login` or `/register`, choose **Continue with Google**, and confirm that a configured Google user reaches `/dashboard`. Repeat after sign-out and verify that canceling consent returns to the account page.

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

## Administration

Better Auth’s Admin plugin stores roles and suspension fields on its existing MongoDB user documents. New accounts default to `user`. Legacy users with no role are treated as ordinary users without a backfill. MongoDB uses flexible documents, so these optional plugin fields require no SQL-style migration. Existing sessions are read from MongoDB and role changes take effect on the next authorized request. The built-in HTTP admin endpoints are disabled. ToolNest Pro provides its own guarded moderation interface.

To bootstrap, obtain the existing account’s MongoDB ObjectId through a trusted database console. Verify the target environment and account, then run the command from this checkout with that environment’s private configuration. Set `NODE_ENV=development` to load Next.js development-specific environment files when bootstrapping locally.

```sh
node scripts/admin-role.mjs bootstrap EXISTING_USER_ID --confirm
```

To change a role after bootstrap, a trusted database operator must explicitly identify the target and the authorizing administrator. The command validates the role of the authorizing account. It is an operational CLI that relies on control of database credentials, with no public route.

```sh
node scripts/admin-role.mjs grant TARGET_USER_ID --confirm ACTING_ADMIN_ID
node scripts/admin-role.mjs revoke TARGET_USER_ID --confirm ACTING_ADMIN_ID
```

The role workflow and web moderation share a transactional guard. They reject changes to the acting admin and keep an active administrator. Role changes and web moderation use the Admin plugin’s MongoDB schema in a transaction so the user change, session revocation where applicable, and audit entry commit together. This requires a MongoDB replica set.

### Analytics and privacy

- Reporting uses UTC calendar days, including today. Registration cards count live Better Auth accounts. Login counts and other event charts use the selected retention window. Daily active users are distinct signed-in users with a recorded authentication or tool event.
- Directory search volume includes settled searches. The app sends only an optional catalog term, a zero-result flag, and a short-lived attribution ID. Raw queries never leave the directory component. Popular terms need at least five observations. Conversion and other browser-derived counts are approximate and rate-limited per app instance.
- Search events are anonymous by default. Opting in associates only recognized catalog terms with the signed-in user. Deleting history removes those user associations and disables further personalization. Aggregate counts remain available.
- `activity_events`, `tool_usage_events`, and `search_analytics` have timestamp and expiry indexes. The default retention is 30 days, adjustable from 7 to 90 days for newly recorded events. Additional indexes cover user lookups and activity type. MongoDB TTL cleanup is asynchronous.
- `admin_settings` stores global settings and user preferences. `admin_audit_logs` is indexed by date and administrator and retained indefinitely by the application. Set a separate operational retention policy as needed. The application offers no audit mutation endpoints.
- Failed credential responses are recorded without email or user ID. OAuth failures are excluded when their outcome cannot be attributed reliably. Logout is recorded with an active session. Export and account-deletion workflows are unavailable.
- Tool pages record opens and actual favorite changes. Execution metrics only count execution outcomes. Phase 3 leaves all planned tool engines unimplemented.

Run the Phase 3 integration suite after a production build with a local MongoDB replica set. The suite creates and drops a randomly named database on loopback.

```sh
TOOLNEST_TEST_MONGO='mongodb://127.0.0.1:37129/?replicaSet=toolnest-qa' node tests/admin.integration.mjs
```
