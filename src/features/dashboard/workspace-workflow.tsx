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
  const resize = id === "resize-compress";
  const imagesToPdf = id === "images-pdf-check";
  const extract = id === "extract-compress";
  const isImage = resize || imagesToPdf;
  const multiple = !resize && !extract;
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("630");
  const [quality, setQuality] = useState("82");
  const [target, setTarget] = useState("2048");
  const [range, setRange] = useState("1");
  const tool = {
    "resize-compress": "image-resizer",
    "merge-check": "pdf-merger",
    "images-pdf-check": "pdf-toolkit",
    "extract-compress": "pdf-splitter",
  }[id];
  const job = useFileJob(tool);

  function select(input: File[]) {
    job.clear();
    setFiles(input);
  }

  function run() {
    void job.run(async (context) => {
      if (resize) {
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

      const [pdf] = await pdfJob<Artifact[]>(
        imagesToPdf
          ? { type: "images", files, pageSize: "A4", orientation: "portrait", margin: 24 }
          : extract
            ? { type: "split", file: files[0], range, separate: false }
            : { type: "merge", files },
        context,
      );
      let output = pdf;
      if (!imagesToPdf) {
        context.progress("Repacking PDF…");
        const [optimized] = await pdfJob<Artifact[]>(
          {
            type: "optimize",
            file: new File([pdf.blob], pdf.name, { type: "application/pdf" }),
          },
          context,
        );
        if (optimized.blob.size < pdf.blob.size) output = optimized;
      }
      const within = output.blob.size <= Number(target) * 1024;
      return [
        {
          ...output,
          name: pdf.name,
          originalBytes: extract
            ? pdf.blob.size
            : files.reduce((sum, file) => sum + file.size, 0),
          detail: `${within ? "Within target" : "Over target"} · ${fileSize(output.blob.size)} for a ${target} KB target`,
        },
      ];
    });
  }

  return (
    <FileWorkspace
      job={job}
      notice={resize
        ? "JPG, PNG, or WebP, up to 20 MB."
        : imagesToPdf
          ? "Up to 12 images, 20 MB each and 60 MB total. Output uses A4 portrait pages."
          : extract ? "One PDF, up to 30 MB." : "Up to 12 PDFs, 30 MB each and 60 MB total."}
    >
      <FileDropzone
        label={isImage ? (multiple ? "Choose images" : "Choose an image") : (multiple ? "Choose PDF files" : "Choose a PDF")}
        accept={isImage ? acceptImages : "application/pdf,.pdf"}
        multiple={multiple}
        max={multiple ? 12 : 1}
        fileMiB={isImage ? 20 : 30}
        totalMiB={multiple ? 60 : isImage ? 20 : 30}
        disabled={job.busy}
        acceptFiles={select}
      />
      {multiple && <FileOrder rows={files} setRows={select} disabled={job.busy} />}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <fieldset disabled={job.busy} className="space-y-3">
          {resize ? (
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
          {extract && (
            <Field label="Pages to keep">
              <Input required value={range} placeholder="1, 3-5" onChange={(event) => setRange(event.target.value)} />
            </Field>
          )}
          <Button type="submit" disabled={files.length < (id === "merge-check" ? 2 : 1)}>
            Run workflow
          </Button>
        </fieldset>
      </form>
    </FileWorkspace>
  );
}
