import "server-only";

import { deleteWorkspace } from "@/features/student/storage";
import { applicationMongo } from "@/lib/mongodb";

export async function eraseAccountData(userId: string) {
  const { client, db } = applicationMongo();
  await client.withSession((session) =>
    session.withTransaction(async () => {
      await deleteWorkspace(userId, session);
      await db.collection<{ _id: string }>("admin_settings").deleteOne({ _id: `user:${userId}` }, { session });
      for (const name of ["activity_events", "tool_usage_events", "search_analytics"]) {
        await db.collection(name).updateMany({ userId }, { $unset: { userId: "" } }, { session });
      }
      await db.collection("user_feedback").updateMany(
        { userId },
        { $set: { userId: null, userEmail: null } },
        { session },
      );
    }),
  );
}
