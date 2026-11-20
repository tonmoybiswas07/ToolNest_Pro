import "server-only";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/session";
import { emptyStudent } from "./model";
import { readWorkspace } from "./storage";

export function workspaceBinding(sessionId: string) {
  return createHash("sha256")
    .update("student-workspace:" + sessionId)
    .digest("hex");
}

export async function loadStudent() {
  const session = await getSession();
  if (!session)
    return { owner: null, binding: null, revision: 0, data: emptyStudent };
  const { revision, data } = await readWorkspace(session.user.id);
  return {
    owner: session.user.id,
    binding: workspaceBinding(session.session.id),
    revision,
    data,
  };
}

export async function readLimited(
  request: Request,
  max: number,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error("Request too large");
      }
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
