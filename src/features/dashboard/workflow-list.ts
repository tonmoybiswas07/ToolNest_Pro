import type { WorkflowId } from "./device-work";

export const workflows = [
  {
    id: "resize-compress",
    title: "Resize → Compress → Export",
    description: "Set exact image dimensions and JPEG quality in one run.",
  },
  {
    id: "merge-check",
    title: "Merge PDF → Compress → Check size",
    description:
      "Arrange PDFs, repack the merged file, and check it against a size limit.",
  },
] as const satisfies { id: WorkflowId; title: string; description: string }[];
