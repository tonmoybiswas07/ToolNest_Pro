"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  boundedDimensions,
  fileSize,
  type Artifact,
} from "../tools/file-processing/files";
import {
  acceptImages,
  imageJob,
} from "../tools/file-processing/image-controls";
import { defaultImageOptions } from "../tools/file-processing/image-engine";
import { pdfJob } from "../tools/file-processing/pdf-job";
import {
  FileDropzone,
  FileOrder,
  FileWorkspace,
  useFileJob,
} from "../tools/file-processing/workspace";
import { Field, Notice } from "../tools/studios/shared";
import type { WorkflowId } from "./device-work";

export function WorkspaceWorkflow({ id }: { id: WorkflowId }) {
  const image = id === "resize-compress";
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("630");
  const [quality, setQuality] = useState("82");
  const [target, setTarget] = useState("2048");
  const job = useFileJob(image ? "image-resizer" : "pdf-merger");

  function select(input: File[]) {
    job.clear();
    setFiles(input);
  }

  function run() {
    void job.run(async (context) => {
      if (image) {
        const source = files[0];
        boundedDimensions(Number(width), Number(height));
        const result = await imageJob(
          source,
          {
            ...defaultImageOptions,
            width: Number(width),
            height: Number(height),
            quality: Number(quality) / 100,
            format: "image/jpeg",
          },
          context.signal,
        );
        return [{ ...result, source }];
      }

      const [merged] = await pdfJob<Artifact[]>(
        { type: "merge", files },
        context,
      );
      context.progress("Repacking merged PDF…");
      const [optimized] = await pdfJob<Artifact[]>(
        {
          type: "optimize",
          file: new File([merged.blob], merged.name, {
            type: "application/pdf",
          }),
        },
        context,
      );
      const output =
        optimized.blob.size < merged.blob.size ? optimized : merged;
      const within = output.blob.size <= Number(target) * 1024;
      return [
        {
          ...output,
          name: "merged.pdf",
          originalBytes: files.reduce((sum, file) => sum + file.size, 0),
          detail: `${within ? "Within target" : "Over target"} · ${fileSize(output.blob.size)} for a ${target} KB target`,
        },
      ];
    });
  }

  return (
    <FileWorkspace
      job={job}
      notice={
        image
          ? "JPG, PNG, or WebP, up to 20 MB."
          : "Up to 12 PDFs, 30 MB each and 60 MB total."
      }
    >
      <FileDropzone
        label={image ? "Choose an image" : "Choose PDF files"}
        accept={image ? acceptImages : "application/pdf,.pdf"}
        multiple={!image}
        max={image ? 1 : 12}
        fileMiB={image ? 20 : 30}
        totalMiB={image ? 20 : 60}
        disabled={job.busy}
        acceptFiles={select}
      />
      {!image && (
        <FileOrder rows={files} setRows={select} disabled={job.busy} />
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <fieldset disabled={job.busy} className="space-y-3">
          {image ? (
            <>
              <Notice>
                The image is stretched to the chosen dimensions when its aspect
                ratio differs.
              </Notice>
              <Field label="Width (px)">
                <Input
                  type="number"
                  min={1}
                  max={8192}
                  required
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </Field>
              <Field label="Height (px)">
                <Input
                  type="number"
                  min={1}
                  max={8192}
                  required
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </Field>
              <Field label="JPEG quality (%)">
                <Input
                  type="number"
                  min={20}
                  max={100}
                  required
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <Field label="Output size target (KB)">
              <Input
                type="number"
                min={1}
                max={61440}
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
          )}
          <Button type="submit" disabled={files.length < (image ? 1 : 2)}>
            Run workflow
          </Button>
        </fieldset>
      </form>
    </FileWorkspace>
  );
}
