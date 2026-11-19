"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  useOperation,
  Workspace,
} from "../studios/shared";

export function Utility<T>({
  job,
  submit,
  reset,
  label,
  fields,
  render,
  empty = "Run the operation to see a result.",
}: {
  job: ReturnType<typeof useOperation<T>>;
  submit: () => void;
  reset: () => void;
  label: string;
  fields: ReactNode;
  render: (output: T) => ReactNode;
  empty?: string;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job.busy) submit();
  }
  return (
    <Workspace
      input={
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="space-y-4"
        >
          <fieldset disabled={job.busy} className="min-w-0 space-y-4">
            {fields}
            <Actions>
              <Button type="submit">{job.busy ? "Working…" : label}</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  job.clear();
                }}
              >
                Reset
              </Button>
            </Actions>
          </fieldset>
        </form>
      }
      output={
        <>
          {job.busy && <Notice>Processing locally…</Notice>}
          {job.error && <Notice error>{job.error}</Notice>}
          {job.output !== undefined
            ? render(job.output)
            : !job.error && !job.busy && <Notice>{empty}</Notice>}
        </>
      }
    />
  );
}

export function TextOutput({
  value,
  filename,
  label,
}: {
  value: string;
  filename?: string;
  label?: string;
}) {
  return (
    <>
      <CodeBlock>{value}</CodeBlock>
      <ExportActions value={value} filename={filename} label={label} />
    </>
  );
}

export function LocaleField({
  locale,
  setLocale,
}: {
  locale: string;
  setLocale: (locale: string) => void;
}) {
  return (
    <Field label="Locale (optional)">
      <Input
        value={locale}
        maxLength={40}
        placeholder="Browser default, e.g. tr or ja"
        onChange={(event) => setLocale(event.target.value)}
      />
    </Field>
  );
}
