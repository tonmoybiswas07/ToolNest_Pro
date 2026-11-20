# ToolNest Pro

ToolNest Pro is a Next.js catalog for 40 tools. Phase 2 adds accounts and sessions. Phase 3 adds the role-protected admin dashboard and activity reporting. Student Hub adds academic planning, study, and research workspaces.

## Run locally

Use Node.js 22.13 or newer (Node.js 24 is tested) and install the locked dependencies with `npm ci`. Copy `.env.example` to `.env.local`, fill in the values below, and run `npm run dev`. Open `http://localhost:3000` using the same hostname as `BETTER_AUTH_URL`.

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
- Tool pages record opens and actual favorite changes. Execution metrics only count execution outcomes. Phases 4–6A implement 30 browser-based tools. The three social downloaders are still planned.

Run the Phase 3 integration suite after a production build with a local MongoDB replica set. The suite creates and drops a randomly named database on loopback.

```sh
TOOLNEST_TEST_MONGO='mongodb://127.0.0.1:37129/?replicaSet=toolnest-qa' node tests/admin.integration.mjs
```

### Browser studios

The ten available studios process JSON, JWTs, regex input, code, QR data, prompts, and notes in the browser. The analytics endpoint receives only the registry slug, an operation outcome, and an event ID. It derives user identity from the session and rate-limits submissions. Execution counts are best-effort because the operations run on the client.

Saved gradient presets, prompt templates, and notes live in this browser's local storage. Export any work you want to keep before clearing site data or switching devices. Notes render Markdown with raw HTML and external image loading disabled.

The 33-entry catalog includes 30 available tools and three planned entries. Former placeholder URLs for renamed tools redirect to their canonical URLs.

Run the studio engine tests on Node.js 24 with:

```sh
node --experimental-strip-types --test tests/studios.test.mjs
```

### Image and PDF processing

- Image tools accept JPG, PNG, and WebP. Pixel and file size limits are shown in each workspace. Canvas export re-encodes the visible image, discards metadata, and exports a single frame from animated inputs. PNG output uses lossless encoding, although size can increase. JPEG flattens transparency against the chosen background.
- Background Remover is designed for photos of people. It runs the MediaPipe Selfie Segmentation model locally in a worker and lazily fetches a pinned runtime and model (about 10 MB) from jsDelivr and Google Cloud Storage. Edge quality varies, and the browser needs WebAssembly and compatible graphics support. See the [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf).
- PDF tools reject encrypted files. PDF Toolkit opens in edit mode by default. The legacy `/tools/pdf-to-image` and `/tools/image-to-pdf` URLs open their matching modes in `/tools/pdf-toolkit`. PDF.js renders thumbnails and rasterized output in the browser. Interactive annotations are excluded from rendered output. Scanned pages stay image-based.
- PDF compression defaults to a structural repack that leaves existing image streams intact. Actual byte counts are compared, and output can be larger. Explicit JPEG rasterization creates an image-only PDF and can remove text search, vectors, links, forms, annotations, and accessibility features.
- Editing, merging, splitting, or repacking can invalidate signatures. Copying pages may change forms, annotations, bookmarks, or links. The PDF Toolkit watermark font supports Western Latin text.
- An explicit processing run records one outcome per batch and canonical tool. Previews, file selection, cancellations, and repeat downloads do not count as executions. Historical aliases are grouped under the canonical tool when reporting.
- Run file-processing tests with `node --experimental-strip-types --test tests/file-processing.test.mjs`.

### Browser-local utilities

Phase 6A adds URL encoding, text statistics, case conversion, color conversion, unit conversion, percentage calculations, timestamps, SHA-2 hashing, password generation, and UUIDs. Explicit operations send only their canonical slug, event ID, and outcome to analytics. Text, hashes, files, passwords, and UUIDs generated by the utilities are never uploaded by the tools.

- Word Counter uses `Intl.Segmenter` where available. On older browsers, word counts use a Unicode pattern and grapheme counts fall back to code points.
- Timestamp Converter rejects skipped local times and requires a choice when a time repeats. It loads the Temporal polyfill only for date input and only when native Temporal is unavailable. Unix seconds accept milliseconds as fractional seconds.
- Hash Generator reads local files up to 16 MB. Hashing and UUID generation require a secure browsing context such as HTTPS or localhost. Passwords stay in memory until reset or navigation, and copying always requires an explicit click.
- Run utility engine tests with `node --experimental-strip-types --test tests/utilities.test.mjs`.

## Student Hub

Open `/student` to browse ten academic tools and `/student/settings` to create shared courses, set the time zone, and choose attendance and study targets. Guests use a browser-local workspace. Signed-in users have a separate synced workspace. The two workspaces are independent.

Student Hub uses `student_profiles`, `student_courses`, `student_assignments`, `student_class_schedules`, `student_attendance`, `student_grades`, `student_flashcards`, `student_study_sessions`, `student_exam_plans`, and `student_notes`. Each collection stores one document per account, keyed by the Better Auth user ID. The built-in unique `_id` indexes support owner-scoped reads and writes. A revision check and MongoDB snapshot transactions keep shared records consistent across devices. Use a replica set or Atlas deployment that supports transactions. The workspace payload limit is 500 KB. The optional AI endpoint creates `student_summary_limits` with MongoDB's unique `_id` index and a TTL index named `student_summary_expiry` on `expiresAt`. The existing analytics and favorites collections continue using the same tool identifiers, including retired identifiers in historical reports.

PDF text extraction and English/Bengali image OCR run in the browser. Scanned PDF pages need OCR. The optional AI summarizer uses the OpenAI Responses API after explicit consent. To enable it, set `STUDENT_OPENAI_API_KEY` and `STUDENT_OPENAI_MODEL` on the server. Each signed-in account can make five requests per UTC day, with at most 18,000 source characters and 1,800 output tokens per request. Review summaries against their source.

Routine and grade reports use the browser's Print / Save PDF dialog. Flashcard decks round-trip through ToolNest JSON, including review dates. Known cards return after 1, 2, 4, 8 days and so on, capped at 64 days. Unknown cards return the next day and reset the streak.

### Regression checks

Run `npm run lint`, `npm run typecheck`, `node --test tests/*.test.mjs`, and `npm run build`. The MongoDB and browser checks require a local MongoDB replica set at `mongodb://127.0.0.1:37129/?replicaSet=toolnest-qa`, or a loopback replica set specified via `TOOLNEST_TEST_MONGO`. Both checks create and drop their own randomly named local test databases.

Run `node tests/admin.integration.mjs` for Better Auth, user isolation, and analytics. Run `npx playwright install chromium` then `node tests/student.browser.mjs` for Chromium workflows and axe checks. Set `TOOLNEST_TEST_BROWSER` to use an installed Chromium or Chrome binary.
