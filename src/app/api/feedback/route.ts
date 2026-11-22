import { getSession } from "@/lib/session";
import { applicationMongo } from "@/lib/mongodb";
import { z } from "zod";

const feedbackSchema = z.object({
  type: z.enum(["feedback", "bug", "suggestion"]),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(3).max(2000),
  tool: z.string().trim().max(100).optional(),
  url: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = feedbackSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid feedback input." }, { status: 400 });
    }

    const session = await getSession();
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email ?? null;

    try {
      const { db } = applicationMongo();
      await db.collection("user_feedback").insertOne({
        ...parsed.data,
        userId,
        userEmail,
        createdAt: new Date(),
      });
    } catch {
      // If DB is offline or local-only, we still accept feedback gracefully
      console.warn("Feedback recorded in memory/logs:", parsed.data);
    }

    return Response.json({ success: true, message: "Thank you for your feedback!" });
  } catch {
    return Response.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
