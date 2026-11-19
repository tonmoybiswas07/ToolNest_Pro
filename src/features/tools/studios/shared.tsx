"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendAnalytics } from "@/features/analytics/client";
import { cn } from "@/lib/utils";

export type StudioProps = { slug: string };

export function trackOperation(slug: string, success: boolean) {
  if (typeof crypto.randomUUID !== "function") return;
  void sendAnalytics({
    type: success ? "executed" : "failed",
    slug,
    id: crypto.randomUUID(),
  }).catch(() => {});
}

export function useOperation<T>(slug: string) {
  const [output, setOutput] = useState<T>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (operation: () => T | Promise<T>) => {
      setBusy(true);
      setError("");
      setOutput(undefined);
      try {
        const result = await operation();
        setOutput(result);
        trackOperation(slug, true);
      } catch (failure) {
        setError(
          failure instanceof Error ? failure.message : "The operation failed.",
        );
        trackOperation(slug, false);
      } finally {
        setBusy(false);
      }
    },
    [slug],
  );
  return {
    output,
    error,
    busy,
    run,
    clear: () => {
      setError("");
      setOutput(undefined);
    },
  };
}

export function Workspace({
  input,
  output,
}: {
  input: ReactNode;
  output: ReactNode;
}) {
  return (
    <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-2">
      <Panel title="Input">{input}</Panel>
      <Panel title="Output">{output}</Panel>
    </div>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="surface min-w-0 space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      spellCheck={false}
      className={cn(
        "min-h-28 w-full min-w-0 resize-y rounded-xl border border-input bg-background p-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return (
    <div className="grid gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

export const selectClass =
  "h-11 rounded-xl border border-input bg-background px-3 text-sm";

export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "break-words text-sm",
        error ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-border bg-background p-3 text-sm">
      {children}
    </pre>
  );
}

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard.");
  } catch {
    toast.error("Clipboard access is unavailable.");
  }
}

export function downloadFile(
  name: string,
  content: string | Blob,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Download started.");
}

export function ExportActions({
  value,
  filename,
  type,
  label = "Copy output",
}: {
  value: string;
  filename?: string;
  type?: string;
  label?: string;
}) {
  return (
    <Actions>
      <Button
        type="button"
        variant="outline"
        onClick={() => void copyText(value)}
      >
        <Copy size={16} aria-hidden />
        {label}
      </Button>
      {filename && (
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadFile(filename, value, type)}
        >
          <Download size={16} aria-hidden />
          Download
        </Button>
      )}
    </Actions>
  );
}

export async function readLocalFile(file: File, limit: number) {
  if (file.size > limit)
    throw new Error(`Choose a file under ${Math.round(limit / 1024)} KB.`);
  return file.text();
}

export function useLiveMetric(slug: string, result: string, changed: boolean) {
  const recorded = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!changed) {
      recorded.current = undefined;
      return;
    }
    if (recorded.current === result) return;
    const timer = window.setTimeout(() => {
      trackOperation(slug, Boolean(result));
      recorded.current = result;
    }, 750);
    return () => window.clearTimeout(timer);
  }, [changed, result, slug]);
}

export function readStorage<T>(
  key: string,
  guard: (value: unknown) => value is T,
  fallback: T,
): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return guard(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    toast.error("This browser could not save the data locally.");
    return false;
  }
}
