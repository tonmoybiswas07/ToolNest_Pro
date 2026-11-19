import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { MongoClient, ObjectId } from "mongodb";

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

async function signup(name) {
  const email = `${name.toLowerCase()}@example.com`;
  const response = await request("/api/auth/sign-up/email", {
    body: { name, email, password },
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

async function verify() {
  let ready;
  for (let index = 0; index < 70 && !ready; index++) {
    ready = await request("/api/auth/get-session").catch(() => null);
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.equal(ready?.status, 200);

  assert.equal((await request("/api/admin")).status, 401);
  assert.equal((await request("/admin")).headers.get("location"), "/login");
  const owner = await signup("Owner");
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

  for (const path of [
    "",
    "/users",
    `/users/${member.id}`,
    "/activity",
    "/searches",
    "/tools",
    "/audit-logs",
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
        slug: "image-compressor",
      })
    ).status,
    400,
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
  const usage = await (await request("/admin/tools?days=7", owner)).text();
  assert.match(usage, /JSON Studio/);
  assert.match(usage, /Successful executions/);
  const personal = await (
    await request("/dashboard", { cookie: refreshed })
  ).text();
  assert.match(personal, /Recently used tools/);
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

  console.log("Phase 3 integration checks passed.");
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
