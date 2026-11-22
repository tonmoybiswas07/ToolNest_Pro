"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  selectClass,
  TextArea,
  Workspace,
  useOperation,
  type StudioProps,
} from "./shared";

const MAX = 500_000;

function textToBase64(text: string) {
  return btoa(unescape(encodeURIComponent(text)));
}

function base64ToText(b64: string) {
  return decodeURIComponent(escape(atob(b64.trim())));
}

export default function Base64Studio({ slug }: StudioProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode" | "image">("encode");
  const [imageResult, setImageResult] = useState("");
  const { output, error, busy, run, clear } = useOperation<string>(slug);

  function execute() {
    void run(() => {
      if (mode === "encode") return textToBase64(input);
      if (mode === "decode") return base64ToText(input);
      return "";
    });
  }

  function handleImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setImageResult(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Workspace
      input={
        <>
          <Field label="Mode">
            <select
              className={selectClass}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as typeof mode);
                clear();
                setImageResult("");
              }}
            >
              <option value="encode">Text → Base64</option>
              <option value="decode">Base64 → Text</option>
              <option value="image">Image → Data URI</option>
            </select>
          </Field>
          {mode !== "image" ? (
            <TextArea
              aria-label={mode === "encode" ? "Plain text" : "Base64 string"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX}
            />
          ) : (
            <label className="block text-sm font-medium">
              Upload image
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleImage(file);
                }}
              />
            </label>
          )}
          {mode !== "image" && (
            <Actions>
              <Button type="button" disabled={busy} onClick={execute}>
                {mode === "encode" ? "Encode" : "Decode"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setInput("");
                  clear();
                }}
              >
                Reset
              </Button>
            </Actions>
          )}
        </>
      }
      output={
        <>
          {error && <Notice error>{error}</Notice>}
          {mode === "image" && imageResult ? (
            <>
              <Notice>Data URI generated ({imageResult.length} chars).</Notice>
              <CodeBlock>{imageResult}</CodeBlock>
              <ExportActions value={imageResult} filename="image.txt" label="Copy Data URI" />
            </>
          ) : output !== undefined ? (
            <>
              <CodeBlock>{output}</CodeBlock>
              <ExportActions
                value={output}
                filename={mode === "encode" ? "encoded.txt" : "decoded.txt"}
              />
            </>
          ) : (
            !error && <Notice>Enter text and choose an operation.</Notice>
          )}
        </>
      }
    />
  );
}
