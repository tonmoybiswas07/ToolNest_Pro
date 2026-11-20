"use client";

import { draftKeys, localDraftId } from "@/features/dashboard/draft-storage";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  blankPrompt,
  composePrompt,
  isTemplates,
  promptLabels,
  type Prompt,
} from "./writing-engines";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  readStorage,
  saveStorage,
  TextArea,
  type StudioProps,
  useLiveMetric,
  Workspace,
} from "./shared";

const storageKey = draftKeys.prompts;
const templates = [
  {
    id: "builtin-editor",
    fields: {
      ...blankPrompt,
      title: "Editorial revision",
      role: "You are a careful copy editor.",
      task: "Revise the supplied copy for clarity and consistency.",
      constraints: "Preserve factual claims and authorial intent.",
      format:
        "Return the revised copy followed by a short list of meaningful edits.",
    },
  },
  {
    id: "builtin-analysis",
    fields: {
      ...blankPrompt,
      title: "Decision brief",
      role: "You are an analyst helping a team make an informed decision.",
      task: "Summarize the options and identify the most consequential tradeoffs.",
      format: "Use a comparison table and end with open questions.",
    },
  },
];

export default function PromptBuilder({ slug }: StudioProps) {
  const [saved, setSaved] = useState(() =>
    readStorage(storageKey, isTemplates, []),
  );
  const [initialDraft] = useState(() => saved.find(item => item.id === localDraftId()));
  const [fields, setFields] = useState<Prompt>(initialDraft?.fields ?? blankPrompt);
  const [selected, setSelected] = useState<string | undefined>(initialDraft?.id);
  const [search, setSearch] = useState("");
  const [changed, setChanged] = useState(false);
  const output = composePrompt(fields);
  useLiveMetric(slug, output, changed && Boolean(fields.task.trim()));

  function edit(key: keyof Prompt, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setChanged(true);
  }

  function save() {
    const title = fields.title.trim();
    if (!title || !output) return;
    if (!selected && saved.length >= 40) {
      toast.error("Delete a saved template before adding another.");
      return;
    }
    const id = selected ?? crypto.randomUUID();
    const entry = { id, fields: { ...fields, title } };
    const next = selected
      ? saved.map((template) => (template.id === selected ? entry : template))
      : [...saved, entry];
    if (saveStorage(storageKey, next)) {
      setSaved(next);
      setSelected(id);
      toast.success("Template saved on this device.");
    }
  }

  return (
    <Workspace
      input={
        <>
          <Field label="Search templates">
            <Input
              type="search"
              maxLength={120}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-auto">
            {[...templates, ...saved]
              .filter((template) =>
                template.fields.title
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()),
              )
              .map((template) => (
                <Button
                  type="button"
                  variant="outline"
                  key={template.id}
                  className="h-auto max-w-full whitespace-normal wrap-break-word py-2 text-left"
                  onClick={() => {
                    setFields(template.fields);
                    setSelected(
                      template.id.startsWith("builtin-")
                        ? undefined
                        : template.id,
                    );
                    setChanged(true);
                  }}
                >
                  {template.fields.title}
                </Button>
              ))}
            {![...templates, ...saved].some((template) =>
              template.fields.title
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
            ) && <Notice>No templates match your search.</Notice>}
          </div>
          {(Object.keys(fields) as (keyof Prompt)[]).map((key) => (
            <Field key={key} label={promptLabels[key]}>
              {key === "title" ? (
                <Input
                  value={fields[key]}
                  maxLength={100}
                  onChange={(event) => edit(key, event.target.value)}
                />
              ) : (
                <TextArea
                  value={fields[key]}
                  className="min-h-18"
                  maxLength={6000}
                  onChange={(event) => edit(key, event.target.value)}
                />
              )}
            </Field>
          ))}
          <Actions>
            <Button
              type="button"
              disabled={!fields.title.trim() || !output}
              onClick={save}
            >
              {selected ? "Update template" : "Save custom template"}
            </Button>
            {selected && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!window.confirm("Delete this saved template?")) return;
                  const next = saved.filter(
                    (template) => template.id !== selected,
                  );
                  if (saveStorage(storageKey, next)) {
                    setSaved(next);
                    setSelected(undefined);
                    toast.success("Template deleted.");
                  }
                }}
              >
                Delete template
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFields(blankPrompt);
                setSelected(undefined);
                setChanged(false);
                setSearch("");
              }}
            >
              Reset
            </Button>
          </Actions>
        </>
      }
      output={
        <>
          <Notice>
            Compose and export prompts. Templates are stored on this device.
          </Notice>
          {output ? (
            <>
              <CodeBlock>{output}</CodeBlock>
              <ExportActions
                value={output}
                filename="prompt.txt"
                label="Copy prompt"
              />
            </>
          ) : (
            <Notice>Enter a task description to preview your prompt.</Notice>
          )}
        </>
      }
    />
  );
}
