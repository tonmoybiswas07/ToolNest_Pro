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
  {
    id: "images-pdf-check",
    title: "Images → PDF → Check size",
    description: "Arrange photos or scans into a PDF and check the file against a size limit.",
  },
  {
    id: "extract-compress",
    title: "Extract PDF pages → Compress → Check size",
    description: "Keep a page range, repack the new PDF, and check its size.",
  },
] as const satisfies { id: WorkflowId; title: string; description: string }[];
