import "server-only";

import { MongoClient } from "mongodb";

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

let authIndexes: Promise<unknown> | undefined;

export function ensureAuthIndexes(client: MongoClient) {
  const db = client.db("mongodb user");

  authIndexes ??= Promise.all([
    db.collection("user").createIndex({ email: 1 }, { name: "user_email_uidx", unique: true }),
    db.collection("rateLimit").createIndex({ key: 1 }, { name: "rateLimit_key_uidx", unique: true }),
  ]).catch((error: unknown) => {
    authIndexes = undefined;
    throw error;
  });

  return authIndexes;
}
