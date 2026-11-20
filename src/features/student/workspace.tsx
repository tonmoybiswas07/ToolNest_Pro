"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendAnalytics } from "@/features/analytics/client";
import { emptyStudent, studentSchema, type Student } from "./model";

type Snapshot = { binding: string | null; revision: number; data: Student };
type Workspace = {
  data: Student;
  pending: boolean;
  save: (data: Student, track?: boolean) => Promise<boolean>;
};
const Context = createContext<Workspace | null>(null);
const storageKey = "toolnest-student-v1";
export const useStudent = () => useContext(Context)!;
export const newId = () => crypto.randomUUID();

export function operation(slug: string, ok: boolean) {
  if (slug)
    void sendAnalytics({
      slug,
      id: newId(),
      type: ok ? "executed" : "failed",
    }).catch(() => {});
}

export function StudentWorkspace({
  snapshot,
  slug = "",
  children,
}: {
  snapshot: Snapshot;
  slug?: string;
  children: ReactNode;
}) {
  const [data, setData] = useState(snapshot.data);
  const [ready, setReady] = useState(!!snapshot.binding);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const revision = useRef(snapshot.revision);
  const baseline = useRef<string | null>(null);
  useEffect(() => {
    if (snapshot.binding) return;
    const read = () => {
      try {
        baseline.current = localStorage.getItem(storageKey);
        const parsed = studentSchema.safeParse(
          JSON.parse(baseline.current ?? "null"),
        );
        setData(
          parsed.success
            ? parsed.data
            : {
                ...emptyStudent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
        );
      } catch {
        setData(emptyStudent);
      }
      setReady(true);
    };
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) read();
    };
    const timer = setTimeout(read, 0);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", sync);
    };
  }, [snapshot.binding]);

  async function save(next: Student, track = true) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    try {
      const parsed = studentSchema.safeParse(next);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      if (snapshot.binding) {
        const response = await fetch("/api/student", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Student-Workspace": snapshot.binding,
          },
          body: JSON.stringify({
            revision: revision.current,
            data: parsed.data,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not save.");
        revision.current = result.revision;
      } else {
        if (localStorage.getItem(storageKey) !== baseline.current)
          throw new Error(
            "This workspace changed in another tab. Refresh and retry.",
          );
        const serialized = JSON.stringify(parsed.data);
        if (new Blob([serialized]).size > 490_000)
          throw new Error("This workspace exceeds 490 KB.");
        localStorage.setItem(storageKey, serialized);
        baseline.current = serialized;
      }
      setData(parsed.data);
      if (track) operation(slug, true);
      return true;
    } catch (error) {
      if (track) operation(slug, false);
      toast.error(error instanceof Error ? error.message : "Could not save.");
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (!ready) return <StudentSkeleton />;
  return (
    <Context.Provider value={{ data, pending, save }}>
      <p className="mb-5 text-sm text-muted-foreground">
        {snapshot.binding ? (
          "Changes sync to your account."
        ) : (
          <>
            Guest work stays in this browser.{" "}
            <Link className="underline" href="/login">
              Sign in
            </Link>{" "}
            to use an account workspace.
          </>
        )}
      </p>
      {children}
    </Context.Provider>
  );
}

export function StudentSkeleton() {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2">
      <span className="sr-only">Loading Student Hub</span>
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="surface h-32 animate-pulse motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`student-widget min-w-0 p-5 sm:p-6 ${className}`}>
      <h2 className="mb-4 border-b border-border pb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  name,
  value,
  options,
  type = "text",
  optional,
  multiline,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  value?: string | number;
  options?: [string | number, string][];
  type?: string;
  optional?: boolean;
  multiline?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  const labelId = useId();
  return (
    <label className="grid min-w-0 content-start gap-1.5 text-sm font-medium">
      <span id={labelId}>{label}</span>
      {options ? (
        <select
          aria-labelledby={labelId}
          className="student-input"
          name={name}
          defaultValue={value ?? ""}
          required={!optional}
        >
          {value === undefined && <option value="">Select…</option>}
          {options.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          aria-labelledby={labelId}
          className="student-input min-h-24"
          name={name}
          defaultValue={value}
          required={!optional}
          maxLength={max ?? 4000}
        />
      ) : (
        <input
          className="student-input"
          aria-labelledby={labelId}
          type={type}
          name={name}
          defaultValue={value}
          required={!optional}
          min={min}
          max={max}
          step={step}
          maxLength={type === "text" ? (max ?? 150) : undefined}
        />
      )}
    </label>
  );
}

export function Form({
  children,
  onSave,
  label = "Save",
  reset = false,
}: {
  children: ReactNode;
  onSave: (values: FormData) => Promise<boolean>;
  label?: string;
  reset?: boolean;
}) {
  const { pending } = useStudent();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      if ((await onSave(new FormData(form))) && reset) form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Check the values and try again.",
      );
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        {children}
        <div className="self-end sm:col-span-2">
          <Button type="submit">{label}</Button>
        </div>
      </fieldset>
    </form>
  );
}

export const get = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export const choices = (values: readonly string[]): [string, string][] =>
  values.map((value) => [value, value]);
export const courseOptions = (data: Student): [string, string][] =>
  data.courses.map((course) => [course.id, `${course.code} · ${course.name}`]);
export const courseName = (data: Student, id: string | null) =>
  data.courses.find((course) => course.id === id)?.name ?? "General study";
export const priority = choices(["Low", "Normal", "High"]);
export const replace = <T extends { id: string }>(rows: T[], row: T) =>
  rows.some((item) => item.id === row.id)
    ? rows.map((item) => (item.id === row.id ? row : item))
    : [...rows, row];
export const without = <T extends { id: string }>(rows: T[], id: string) =>
  rows.filter((row) => row.id !== id);
export const readable = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(instant));

export function Row({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <h3 className="font-medium wrap-anywhere">{title}</h3>
        <div className="text-sm text-muted-foreground wrap-anywhere">
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
    </li>
  );
}

export function EditActions({
  edit,
  remove,
  title,
}: {
  edit: () => void;
  remove: () => void;
  title: string;
}) {
  const { pending } = useStudent();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Edit ${title}`}
        onClick={edit}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Delete ${title}`}
        onClick={() => {
          if (window.confirm(`Delete ${title}?`)) remove();
        }}
      >
        Delete
      </Button>
    </>
  );
}

export function CoursePrompt() {
  return (
    <p className="text-sm text-muted-foreground">
      Add a course in{" "}
      <Link href="/student/settings" className="underline">
        Student settings
      </Link>{" "}
      to get started.
    </p>
  );
}

export function download(name: string, contents: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Clipboard unavailable.");
  }
}

export function OutputActions({ text, name }: { text: string; name: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => void copyText(text)}
      >
        Copy
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => download(name, text)}
      >
        Download TXT
      </Button>
    </div>
  );
}
