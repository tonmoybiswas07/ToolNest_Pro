import nextEnv from "@next/env";
import { MongoClient, ObjectId } from "mongodb";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");
const [, , operation, id, confirmation, actor] = process.argv;
const validId = (value) => /^[a-f\d]{24}$/i.test(value ?? "");

async function run() {
  if (
    !["bootstrap", "grant", "revoke"].includes(operation) ||
    !validId(id) ||
    confirmation !== "--confirm" ||
    (operation !== "bootstrap" &&
      (!validId(actor) || actor.toLowerCase() === id.toLowerCase()))
  ) {
    throw new Error(
      "Usage: node scripts/admin-role.mjs bootstrap|grant|revoke USER_ID --confirm [ACTING_ADMIN_ID]",
    );
  }

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  try {
    const db = client.db();
    await db.createCollection("admin_settings").catch((error) => {
      if (error.code !== 48) throw error;
    });
    await db.createCollection("admin_audit_logs").catch((error) => {
      if (error.code !== 48) throw error;
    });
    await db
      .collection("admin_settings")
      .updateOne(
        { _id: "role-guard" },
        { $setOnInsert: { revision: 0 } },
        { upsert: true },
      );
    const users = db.collection("user");
    const targetId = new ObjectId(id);
    const active = {
      role: "admin",
      $or: [{ banned: { $ne: true } }, { banExpires: { $lte: new Date() } }],
    };
    const changed = await client.withSession((session) =>
      session.withTransaction(async () => {
        await db
          .collection("admin_settings")
          .updateOne(
            { _id: "role-guard" },
            { $inc: { revision: 1 } },
            { session },
          );
        const user = await users.findOne(
          { _id: targetId },
          { projection: { role: 1, banned: 1, banExpires: 1 }, session },
        );
        if (!user) throw new Error("Target user does not exist.");
        if (
          operation !== "bootstrap" &&
          !(await users.findOne(
            { ...active, _id: new ObjectId(actor) },
            { session, projection: { _id: 1 } },
          ))
        ) {
          throw new Error(
            "An active administrator must authorize this operation.",
          );
        }
        const next = operation === "revoke" ? "user" : "admin";
        if ((user.role ?? "user") === next) return false;
        if (
          operation === "bootstrap" &&
          (await users.countDocuments({ role: "admin" }, { session }))
        )
          throw new Error(
            "Bootstrap requires an installation without an administrator.",
          );
        if (
          next === "admin" &&
          user.banned &&
          (!user.banExpires || user.banExpires > new Date())
        )
          throw new Error("A suspended account cannot be promoted.");
        if (
          next === "user" &&
          (await users.countDocuments(
            { ...active, _id: { $ne: targetId } },
            { session },
          )) === 0
        )
          throw new Error("At least one active administrator must remain.");
        await users.updateOne(
          { _id: targetId },
          { $set: { role: next, updatedAt: new Date() } },
          { session },
        );
        await db.collection("admin_audit_logs").insertOne(
          {
            actorId: operation === "bootstrap" ? "local-bootstrap" : actor,
            targetId: id,
            action: "role_change",
            summary: next,
            at: new Date(),
            outcome: "success",
          },
          { session },
        );
        return true;
      }),
    );
    console.log(changed ? "Role updated." : "Role already set.");
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error(
    error.constructor === Error
      ? error.message
      : "Role update failed. Check database configuration and permissions.",
  );
  process.exitCode = 1;
});
