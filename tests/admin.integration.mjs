import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { MongoClient, ObjectId } from "mongodb";
import { signInOnlyTools, toolHref, tools } from "../src/features/tools/registry.ts";
import { emptyStudent } from "../src/features/student/model.ts";

const address = new URL(
  process.env.TOOLNEST_TEST_MONGO ??
    "mongodb://127.0.0.1:37129/?replicaSet=toolnest-qa",
);
assert.equal(address.protocol, "mongodb:");
assert.ok(["127.0.0.1", "localhost"].includes(address.hostname));
assert.equal(address.username, "");
assert.equal(address.password, "");
address.pathname = `/toolnest_phase3_test_${randomBytes(5).toString("hex")}`;
const uri = address.href;
const origin = "http://localhost:3193";
const password = "Local-test-password!";
const env = {
  ...process.env,
  MONGODB_URI: uri,
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: randomBytes(48).toString("base64"),
  GOOGLE_CLIENT_ID: "phase3-dummy.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "test-only",
  RESEND_API_KEY: "",
  AUTH_EMAIL_FROM: "",
  STUDENT_OPENAI_API_KEY: "",
  STUDENT_OPENAI_MODEL: "",
  RESEND_API_KEY: "",
  AUTH_EMAIL_FROM: "",
  SOCIAL_DOWNLOAD_PROVIDER_URL: "",
};
const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
const db = mongo.db();
const app = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3193",
  ],
  { env, stdio: "ignore" },
);
const exited = new Promise((resolve) => app.once("close", resolve));
const adminPage = (path) => `/admin${path}`;

function request(path, { cookie, body, ip, requestOrigin = origin } = {}) {
  return fetch(origin + path, {
    redirect: "manual",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(ip ? { "x-forwarded-for": ip } : {}),
      ...(body
        ? { origin: requestOrigin, "content-type": "application/json" }
        : {}),
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
}

function cookieFrom(response) {
  return response.headers
    .getSetCookie()
    .find((value) => value.startsWith("better-auth.session_token="))
    ?.split(";")[0];
}

async function signup(name, ip) {
  const email = `${name.toLowerCase()}@example.com`;
  const response = await request("/api/auth/sign-up/email", {
    body: { name, email, password },
    ip,
  });
  assert.equal(response.status, 200);
  const cookie = cookieFrom(response);
  assert.ok(cookie);
  const data = await response.json();
  assert.equal(data.user.role, "user");
  return { id: data.user.id, email, cookie };
}

function changeRole(operation, target, actor) {
  return promisify(execFile)(
    process.execPath,
    [
      "scripts/admin-role.mjs",
      operation,
      target,
      "--confirm",
      ...(actor ? [actor] : []),
    ],
    { env },
  );
}

async function expectRedirect(response, target) {
  if (response.status === 307) {
    assert.equal(response.headers.get("location"), target);
    return;
  }
  assert.equal(response.status, 200);
  const markup = await response.text();
  assert.ok(markup.includes(`http-equiv="refresh" content="1;url=${target}"`), target);
}

async function verify() {
  let ready;
  for (let index = 0; index < 70 && !ready; index++) {
    ready = await request("/api/auth/get-session").catch(() => null);
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.equal(ready?.status, 200);

  const redirects = {
    "image-cropper": "image-editor", "image-watermark": "social-media-image-studio",
    "json-formatter": "json-studio", "base64-converter": "jwt-inspector",
    "regex-tester": "regex-lab", "text-diff": "code-diff-studio",
    "duplicate-line-remover": "smart-notes-studio",
    "palette-generator": "color-system-generator", "gradient-builder": "gradient-studio",
    "qr-code-generator": "qr-code-studio",
    "pdf-to-image": "pdf-toolkit?mode=pdf-to-image", "image-to-pdf": "pdf-toolkit?mode=image-to-pdf",
    "pdf-merge": "pdf-merger", "pdf-split": "pdf-splitter",
  };
  for (const [legacy, canonical] of Object.entries(redirects)) {
    const response = await request(`/tools/${legacy}`);
    assert.equal(response.status, 308, legacy);
    assert.equal(response.headers.get("location"), `/tools/${canonical}`);
    const destination = `/tools/${canonical}`;
    const target = await request(destination);
    if (signInOnlyTools.has(canonical.split("?")[0])) {
      await expectRedirect(target, "/login?next=" + encodeURIComponent(destination));
    } else assert.equal(target.status, 200);
  }

  assert.equal((await request("/api/admin")).status, 401);
  assert.equal((await request("/admin")).headers.get("location"), "/login");
  const owner = await signup("Owner");
  assert.equal(signInOnlyTools.size, 18);
  for (const tool of tools) {
    const path = toolHref(tool);
    const response = await request(path);
    if (signInOnlyTools.has(tool.slug)) {
      await expectRedirect(response, `/login?next=${encodeURIComponent(path)}`);
      assert.equal((await request(path, owner)).status, 200, tool.slug);
    } else assert.equal(response.status, 200, tool.slug);
  }
  await expectRedirect(await request("/tools/pdf-toolkit?mode=pdf-to-image"),
    "/login?next=" + encodeURIComponent("/tools/pdf-toolkit?mode=pdf-to-image"));
  for (const next of ["//example.com", "https://example.com", "/tools/../admin", "/tools/assignment-tracker", "/tools/pdf-toolkit#invalid", "/tools/pdf-toolkit\\extra"]) {
    await expectRedirect(await request("/login?next=" + encodeURIComponent(next), owner), "/dashboard");
  }
  await expectRedirect(await request("/login?next=" + encodeURIComponent("/student/tools/attendance-tracker"), owner), "/student/tools/attendance-tracker");
  assert.equal((await request("/api/analytics", { body: { type: "opened", slug: "assignment-tracker", id: randomUUID() } })).status, 401);

  const escalation = await request("/api/auth/sign-up/email", {
    body: {
      name: "Member",
      email: "member@example.com",
      password,
      role: "admin",
    },
  });
  assert.equal(escalation.status, 400);
  const member = await signup("Member");
  assert.equal((await request("/api/admin", member)).status, 403);
  const forbiddenPage = await request("/admin/users", member);
  assert.doesNotMatch(await forbiddenPage.text(), /matching accounts/);
  assert.equal(
    (
      await request("/api/admin", {
        ...member,
        body: { action: "suspend", id: owner.id },
      })
    ).status,
    403,
  );

  await changeRole("bootstrap", owner.id);
  await changeRole("bootstrap", owner.id);
  await assert.rejects(changeRole("bootstrap", member.id));
  await assert.rejects(changeRole("revoke", owner.id, owner.id));
  await assert.rejects(changeRole("grant", owner.id, member.id));
  assert.equal((await request("/api/auth/delete-user", { ...owner, body: { password } })).status, 403);

  for (const path of [
    "",
    "/users",
    `/users/${member.id}`,
    "/activity",
    "/searches",
    "/tools",
    "/audit-logs",
    "/feedback",
    "/settings",
  ]) {
    const response = await request(adminPage(path), owner);
    assert.equal(response.status, 200, path);
    assert.doesNotMatch(
      await response.text(),
      /Administration data unavailable/,
      path,
    );
  }

  const feedback = { type: "suggestion", rating: 5, message: "Feedback integration check" };
  assert.equal((await request("/api/feedback", { ...member, body: feedback })).status, 200);
  const feedbackView = await (await request("/admin/feedback?type=suggestion", owner)).text();
  assert.match(feedbackView, /Feedback integration check/);
  assert.match(feedbackView, /member@example.com/);
  assert.doesNotMatch(await (await request("/admin/feedback?type=bug", owner)).text(), /Feedback integration check/);
  assert.doesNotMatch(await (await request("/admin/feedback", member)).text(), /Feedback integration check/);

  const sitemap = await request("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const urls = await sitemap.text();
  assert.match(urls, /\/tools\/json-studio</);
  assert.doesNotMatch(urls, /\/admin|\/tools\/instagram-video-downloader/);
  assert.match(await (await request("/robots.txt")).text(), /Sitemap: https?:\/\//);

  assert.equal(
    (
      await request("/api/auth/admin/set-role", {
        ...owner,
        body: { userId: member.id, role: "admin" },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request("/api/admin", {
        ...owner,
        body: { action: "settings", settings: {} },
        requestOrigin: "https://invalid.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin", {
        ...owner,
        body: { action: "suspend", id: owner.id },
      })
    ).status,
    403,
  );

  const lookup = await (
    await request("/api/admin?q=member&role=user", owner)
  ).json();
  assert.equal(lookup.rows.length, 1);
  assert.equal(lookup.rows[0].email, member.email);
  assert.deepEqual(lookup.rows[0].providers, ["credential"]);
  assert.ok(!JSON.stringify(lookup).includes(password));
  await db.collection("user").insertMany(
    Array.from({ length: 21 }, (_, index) => ({
      name: `Pagination ${index}`,
      email: `p${index}@example.com`,
      createdAt: new Date(),
      role: "user",
    })),
  );
  const secondPage = await (
    await request("/api/admin?q=pagination&page=2&order=oldest", owner)
  ).json();
  assert.equal(secondPage.count, 21);
  assert.equal(secondPage.rows.length, 1);

  let loginAttempt = 0;
  const signIn = (value) =>
    request("/api/auth/sign-in/email", {
      ip: `192.0.2.${++loginAttempt}`,
      body: { email: member.email, password: value },
    });
  assert.equal((await signIn("wrong-password")).status, 401);
  const login = await signIn(password);
  assert.equal(login.status, 200);
  const loginCookie = cookieFrom(login);
  assert.ok(loginCookie);
  assert.equal(
    (await request("/dashboard", { cookie: loginCookie })).status,
    200,
  );
  assert.equal(
    (await request("/dashboard", { cookie: loginCookie })).status,
    200,
  );
  const activity = db.collection("activity_events");
  assert.equal(
    await activity.countDocuments({ type: "login", userId: member.id }),
    1,
  );
  assert.equal(
    await activity.countDocuments({
      type: "login_failed",
      userId: { $exists: true, $ne: null },
    }),
    0,
  );

  assert.equal(
    (
      await request("/api/admin", {
        ...owner,
        body: { action: "suspend", id: member.id },
      })
    ).status,
    200,
  );
  assert.equal((await signIn(password)).status, 403);
  assert.equal(
    (await request("/dashboard", { cookie: loginCookie })).headers.get(
      "location",
    ),
    "/login",
  );
  assert.equal(
    await db
      .collection("session")
      .countDocuments({ userId: new ObjectId(member.id) }),
    0,
  );
  assert.equal(
    (
      await request("/api/admin", {
        ...owner,
        body: { action: "reactivate", id: member.id },
      })
    ).status,
    200,
  );
  const refreshed = cookieFrom(await signIn(password));
  assert.ok(refreshed);
  const analytics = (body) =>
    request("/api/analytics", { cookie: refreshed, body });
  const search = (id, options = {}) =>
    analytics({
      type: "search",
      id,
      keyword: "image-compressor",
      zero: false,
      ...options,
    });
  const first = randomUUID();
  const second = randomUUID();
  assert.equal((await search(first)).status, 204);
  const searchCollection = db.collection("search_analytics");
  assert.equal(
    (await searchCollection.findOne({ _id: first })).userId,
    undefined,
  );
  assert.equal(
    (await search(randomUUID(), { keyword: "private search text" })).status,
    400,
  );
  assert.equal(
    (await analytics({ type: "consent", enabled: true })).status,
    204,
  );
  assert.equal((await search(second)).status, 204);
  assert.equal((await search(second)).status, 204);
  assert.equal(await searchCollection.countDocuments({ userId: member.id }), 1);
  assert.equal(
    (
      await analytics({
        type: "opened",
        id: randomUUID(),
        slug: "image-compressor",
        searchId: second,
      })
    ).status,
    204,
  );
  assert.equal(
    (await searchCollection.findOne({ _id: second })).converted,
    true,
  );
  assert.equal((await analytics({ type: "delete_history" })).status, 204);
  assert.equal(await searchCollection.countDocuments({ userId: member.id }), 0);
  assert.equal(
    (
      await analytics({
        type: "favorite",
        slug: "image-compressor",
        enabled: true,
      })
    ).status,
    204,
  );
  assert.equal(
    (
      await analytics({
        type: "favorite",
        slug: "image-compressor",
        enabled: true,
      })
    ).status,
    204,
  );
  assert.equal(
    await db
      .collection("tool_usage_events")
      .countDocuments({ userId: member.id, type: "favorite_added" }),
    1,
  );
  assert.equal(
    (await analytics({ type: "executed", slug: "image-compressor" })).status,
    400,
  );
  assert.equal(
    await db
      .collection("tool_usage_events")
      .countDocuments({ type: "executed" }),
    0,
  );

  const execution = { type: "executed", id: randomUUID(), slug: "json-studio" };
  assert.equal((await analytics(execution)).status, 204);
  assert.equal((await analytics(execution)).status, 204);
  assert.equal(
    (await analytics({ ...execution, id: randomUUID(), userId: owner.id }))
      .status,
    400,
  );
  assert.equal(
    (
      await analytics({
        ...execution,
        id: randomUUID(),
        rawInput: "private input",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await analytics({
        ...execution,
        id: randomUUID(),
        slug: "instagram-video-downloader",
      })
    ).status,
    204,
  );
  assert.equal(
    (
      await analytics({
        type: "failed",
        id: randomUUID(),
        slug: "jwt-inspector",
      })
    ).status,
    204,
  );
  assert.equal(
    await db
      .collection("tool_usage_events")
      .countDocuments({
        type: "executed",
        userId: member.id,
        slug: "json-studio",
      }),
    1,
  );
  assert.equal(
    await db
      .collection("tool_usage_events")
      .countDocuments({
        type: "failed",
        userId: member.id,
        slug: "jwt-inspector",
      }),
    1,
  );
  const pdfUsage = { type: "executed", id: randomUUID(), slug: "pdf-toolkit" };
  assert.equal((await analytics(pdfUsage)).status, 204);
  assert.equal((await analytics({ ...pdfUsage, slug: "image-to-pdf" })).status, 400);
  await db.collection("tool_usage_events").insertOne({
    type: "executed", slug: "image-to-pdf", userId: member.id, at: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
  });

  const usage = await (await request("/admin/tools?days=7", owner)).text();
  assert.match(usage, /JSON Studio/);
  assert.match(usage, /Successful executions/);
  assert.match(usage, /<td>PDF Toolkit<\/td><td>Documents<\/td><td>2<\/td><td>1<\/td>/);
  const personal = await (
    await request("/dashboard", { cookie: refreshed })
  ).text();
  assert.match(personal, /Recently used tools/);
  assert.match(personal, /Successful runs per day over the last 14 days/);
  const homeResponse = await request("/api/analytics/recent", { cookie: refreshed });
  assert.equal(homeResponse.headers.get("cache-control"), "private, no-store");
  const homeTasks = await homeResponse.json();
  assert.ok(homeTasks.favorites.includes("image-compressor"));
  assert.ok(homeTasks.slugs.includes("json-studio"));
  assert.match(personal, /JSON Studio/);

  const report = await (await request("/admin/searches?days=7", owner)).text();
  assert.match(report, /50\.0%/);
  assert.equal(
    (
      await request("/api/admin", {
        ...owner,
        body: {
          action: "settings",
          settings: {
            searchEnabled: false,
            activityEnabled: true,
            dashboardDays: 7,
            retentionDays: 14,
          },
        },
      })
    ).status,
    200,
  );
  assert.equal((await search(randomUUID())).status, 204);
  assert.equal(await searchCollection.countDocuments(), 2);
  assert.equal(
    await db.collection("admin_audit_logs").countDocuments({
      action: { $in: ["suspend", "reactivate", "settings"] },
    }),
    3,
  );

  await changeRole("grant", member.id, owner.id);
  assert.equal(
    (await request("/api/admin", { cookie: refreshed })).status,
    200,
  );
  await changeRole("revoke", member.id, owner.id);
  assert.equal(
    (await request("/api/admin", { cookie: refreshed })).status,
    403,
  );

  assert.equal(
    (await request("/api/auth/sign-out", { cookie: refreshed, body: {} }))
      .status,
    200,
  );
  assert.equal(
    await activity.countDocuments({ type: "logout", userId: member.id }),
    1,
  );
  assert.equal(
    (await request("/dashboard", { cookie: refreshed })).headers.get(
      "location",
    ),
    "/login",
  );

  const dashboard = "/student/dashboard";
  const secondStudent = { cookie: cookieFrom(await signIn(password)) };
  assert.ok(secondStudent.cookie);
  async function binding(account) {
    const sessionData = await (await request("/api/auth/get-session", account)).json();
    return createHash("sha256").update("student-workspace:" + sessionData.session.id).digest("hex");
  }
  const ownerBinding = await binding(owner);
  const memberBinding = await binding(secondStudent);
  const coursework = { id: randomUUID(), name: "Astronomy", code: "AST101", color: "#1144aa" };
  const assignment = {
    id: randomUUID(), course: coursework.id, title: "Private stellar worksheet",
    description: "Student test data", due: "2027-01-01T16:00:00Z",
    priority: "High", type: "Worksheet", status: "To do", progress: 0,
  };
  const studentData = { ...emptyStudent, courses: [coursework], assignments: [assignment] };
  function writeStudent(account, token, revision, data, requestOrigin = origin) {
    return fetch(origin + "/api/student", {
      method: "PUT",
      headers: {
        ...(account?.cookie && { cookie: account.cookie }),
        origin: requestOrigin, "content-type": "application/json",
        "x-student-workspace": token,
      },
      body: JSON.stringify({ revision, data }),
    });
  }

  assert.equal((await writeStudent(null, ownerBinding, 0, studentData)).status, 401);
  assert.equal((await writeStudent(owner, ownerBinding, 0, studentData, "https://invalid.example")).status, 403);
  assert.equal((await writeStudent(secondStudent, ownerBinding, 0, studentData)).status, 409);
  assert.equal((await writeStudent(owner, ownerBinding, 0, { ...studentData, assignments: [{ ...assignment, course: randomUUID() }] })).status, 422);
  assert.equal((await writeStudent(owner, ownerBinding, 0, studentData)).status, 200);
  assert.equal((await writeStudent(owner, ownerBinding, 0, studentData)).status, 409);
  assert.equal((await writeStudent(secondStudent, memberBinding, 0, emptyStudent)).status, 200);
  const assignments = db.collection("student_assignments");
  assert.equal((await assignments.findOne({ _id: owner.id })).records.assignments[0].title, assignment.title);
  assert.equal(await assignments.findOne({ _id: member.id }), null);
  assert.equal((await db.collection("student_profiles").findOne({ _id: member.id })).revision, 1);
  assert.match(await (await request(dashboard, owner)).text(), /Private stellar worksheet/);
  assert.doesNotMatch(await (await request(dashboard, secondStudent)).text(), /Private stellar worksheet/);
  assert.doesNotMatch(await (await request(dashboard)).text(), /Private stellar worksheet/);
  await new Promise(resolve => setTimeout(resolve, 450));
  const writes = await Promise.all([
    writeStudent(owner, ownerBinding, 1, { ...studentData, assignments: [] }),
    writeStudent(owner, ownerBinding, 1, { ...studentData, assignments: [{ ...assignment, title: "Edited worksheet" }] }),
  ]);
  assert.deepEqual(writes.map(result => result.status).sort(), [200, 409]);

  const studentAnalytics = payload => request("/api/analytics", { ...secondStudent, body: payload });
  const studentEvent = { type: "executed", id: randomUUID(), slug: "assignment-tracker" };
  const studentEvents = db.collection("tool_usage_events");
  for (const type of ["opened", "executed", "failed"]) {
    const event = { ...studentEvent, id: randomUUID(), type };
    assert.equal((await studentAnalytics(event)).status, 204);
    assert.equal((await studentAnalytics(event)).status, 204);
  }
  assert.equal(
    await studentEvents.countDocuments({ slug: studentEvent.slug, userId: member.id, type: { $in: ["opened", "executed", "failed"] } }),
    3,
  );
  assert.equal((await studentAnalytics({ ...studentEvent, notes: assignment.description })).status, 400);
  assert.equal((await studentAnalytics({ type: "favorite", slug: studentEvent.slug, enabled: true })).status, 204);
  assert.match(await (await request(dashboard, secondStudent)).text(), /Assignment &amp; Deadline Tracker/);
  const socialSlug = "instagram-video-downloader";
  await studentEvents.insertOne({ slug: socialSlug, type: "executed", at: new Date(), expiresAt: new Date(Date.now() + 86400000), userId: member.id });
  await db.collection("admin_settings").updateOne({ _id: `user:${member.id}` }, { $addToSet: { favorites: socialSlug } }, { upsert: true });
  await expectRedirect(await request(`/tools/${socialSlug}`), `/login?next=${encodeURIComponent(`/tools/${socialSlug}`)}`);
  assert.equal((await request("/tools/assignment-tracker")).headers.get("location"), "/student/tools/assignment-tracker");
  assert.match(await (await request("/admin/tools", owner)).text(), /Instagram Video Downloader/);
  assert.match(await (await request("/dashboard", secondStudent)).text(), /Instagram Video Downloader/);

  const socialRequest = { platform: "instagram", url: "https://www.instagram.com/reel/example/" };
  assert.equal((await request("/api/social-download", { body: socialRequest })).status, 401);
  assert.equal((await request("/api/social-download", { ...owner, body: socialRequest })).status, 503);
  assert.equal((await request("/api/social-download", {
    ...owner, body: { ...socialRequest, url: "https://instagram.com.example.org/reel/example/" },
  })).status, 400);
  assert.equal((await request("/api/student/summary", { ...owner, body: { consent: true, mode: "concise", text: "A valid length of source notes" } })).status, 503);

  const google = await request("/api/auth/sign-in/social", {
    body: {
      provider: "google",
      callbackURL: "/dashboard",
      disableRedirect: true,
    },
  });
  assert.equal(google.status, 200);
  const authorization = new URL((await google.json()).url);
  assert.equal(authorization.origin, "https://accounts.google.com");
  assert.equal(
    authorization.searchParams.get("redirect_uri"),
    `${origin}/api/auth/callback/google`,
  );
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");

  await changeRole("grant", member.id, owner.id);
  const concurrentRevocations = await Promise.allSettled([
    changeRole("revoke", owner.id, member.id),
    changeRole("revoke", member.id, owner.id),
  ]);
  assert.equal(
    concurrentRevocations.filter((result) => result.status === "fulfilled")
      .length,
    1,
  );
  assert.equal(
    await db
      .collection("user")
      .countDocuments({ role: "admin", banned: { $ne: true } }),
    1,
  );

  const disposable = await signup("Disposable", "192.0.2.210");
  const authRequest = (endpoint, body, account = disposable) =>
    request(`/api/auth/${endpoint}`, { ...account, body, ip: "192.0.2.210" });

  assert.match(await (await request("/profile", disposable)).text(), /Edit profile/);
  assert.match(await (await request("/settings", disposable)).text(), /Change password/);
  assert.equal((await authRequest("update-user", { image: "data:image/svg+xml;base64,AAAA" })).status, 400);
  const photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=";
  assert.equal((await authRequest("update-user", { name: " Fresh profile ", image: photo })).status, 200);
  assert.match(await (await request("/profile", disposable)).text(), /Fresh profile/);
  assert.equal((await (await authRequest("get-session")).json()).user.image, photo);
  assert.equal((await authRequest("update-user", { image: null })).status, 200);
  assert.equal((await (await authRequest("get-session")).json()).user.image, null);

  assert.equal((await authRequest("send-verification-email", { email: disposable.email }, {})).status, 401);
  const badVerification = await authRequest("verify-email?token=invalid&callbackURL=%2Fsettings");
  assert.equal(badVerification.headers.get("location"), "/settings?error=INVALID_TOKEN");
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const payload = `${encode({ alg: "HS256" })}.${encode({
    email: disposable.email,
    userId: disposable.id,
    exp: Math.floor(Date.now() / 1000) + 60,
  })}`;
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("base64url");
  assert.equal((await authRequest(`verify-email?token=${payload}.${signature}&callbackURL=%2Fsettings`)).headers.get("location"), "/settings");
  assert.equal((await (await authRequest("get-session")).json()).user.emailVerified, true);

  const otherLogin = await authRequest("sign-in/email", { email: disposable.email, password }, {});
  const otherCookie = cookieFrom(otherLogin);
  assert.ok(otherCookie);
  const newPassword = "Updated-test-password!";
  assert.equal((await authRequest("change-password", { currentPassword: "incorrect", newPassword })).status, 400);
  const changed = await authRequest("change-password", { currentPassword: password, newPassword, revokeOtherSessions: true });
  assert.equal(changed.status, 200);
  disposable.cookie = cookieFrom(changed) ?? disposable.cookie;
  assert.equal(await (await authRequest("get-session", undefined, { cookie: otherCookie })).json(), null);
  assert.equal((await authRequest("sign-in/email", { email: disposable.email, password }, {})).status, 401);

  const disposableBinding = await binding(disposable);
  assert.equal((await writeStudent(disposable, disposableBinding, 0, studentData)).status, 200);
  await db.collection("admin_settings").insertOne({ _id: `user:${disposable.id}`, favorites: ["json-studio"] });
  await db.collection("user_feedback").insertOne({ userId: disposable.id, userEmail: disposable.email, message: "Keep anonymous feedback." });
  assert.equal((await authRequest("delete-user", {})).status, 400);
  assert.equal((await authRequest("delete-user", { password })).status, 400);
  assert.equal((await authRequest("delete-user", { password: newPassword })).status, 200);
  assert.equal(await (await authRequest("get-session")).json(), null);
  assert.equal(await db.collection("user").findOne({ _id: new ObjectId(disposable.id) }), null);
  assert.equal(await db.collection("student_profiles").findOne({ _id: disposable.id }), null);
  assert.equal(await assignments.findOne({ _id: disposable.id }), null);
  assert.equal(await db.collection("admin_settings").findOne({ _id: `user:${disposable.id}` }), null);
  assert.equal(await db.collection("user_feedback").countDocuments({ userId: null, userEmail: null, message: "Keep anonymous feedback." }), 1);

  console.log("Admin, authentication, analytics, and Student Hub integration checks passed.");
}

try {
  await verify();
} finally {
  app.kill();
  await exited;
  try {
    await db.dropDatabase();
  } finally {
    await mongo.close();
  }
}
