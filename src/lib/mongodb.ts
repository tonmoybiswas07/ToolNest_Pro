import "server-only";

import { type Db, MongoClient } from "mongodb";

const development = globalThis as typeof globalThis & { toolNestMongoClient?: MongoClient };
let client: MongoClient | undefined;

export function getMongoClient(uri: string) {
  if (process.env.NODE_ENV === "development") {
    development.toolNestMongoClient ??= new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    return development.toolNestMongoClient;
  }

  client ??= new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  return client;
}

export async function ensureAuthIndexes(db: Db) {
  await Promise.all([
    db.collection("user").createIndex({ email: 1 }, { name: "user_email_uidx", unique: true }),
    db.collection("rateLimit").createIndex({ key: 1 }, { name: "rateLimit_key_uidx", unique: true }),
  ]);
}

export function applicationMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database configuration is unavailable.");
  const client = getMongoClient(uri);
  return { client, db: client.db() };
}
