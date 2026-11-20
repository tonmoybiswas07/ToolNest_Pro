import { z } from "zod";
import { getSession } from "@/lib/session";
import { sameOrigin } from "@/features/admin/access";
import { studentSchema } from "@/features/student/model";
import { readLimited, workspaceBinding } from "@/features/student/server";
import { writeWorkspace } from "@/features/student/storage";

const update = z
  .object({ revision: z.number().int().nonnegative(), data: studentSchema })
  .strict();

export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getSession();
  if (!session)
    return Response.json(
      { error: "Sign in again to save changes." },
      { status: 401 },
    );
  if (
    request.headers.get("x-student-workspace") !==
    workspaceBinding(session.session.id)
  ) {
    return Response.json(
      { error: "The active account changed. Reload this workspace." },
      { status: 409 },
    );
  }
  let body: unknown;
  try {
    body = await readLimited(request, 500_000);
  } catch {
    return Response.json(
      { error: "Workspace payload is invalid or exceeds 500 KB." },
      { status: 400 },
    );
  }
  const parsed = update.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 422 },
    );
  const { revision, data } = parsed.data;
  try {
    const status = await writeWorkspace(session.user.id, revision, data);
    if (status === 200) return Response.json({ revision: revision + 1 });
    if (status === 429)
      return Response.json(
        { error: "Wait a moment and try again." },
        { status },
      );
  } catch {
    return Response.json(
      { error: "Student storage is temporarily unavailable." },
      { status: 503 },
    );
  }
  return Response.json(
    {
      error:
        "This workspace changed in another tab. Refresh before saving again.",
    },
    { status: 409 },
  );
}
