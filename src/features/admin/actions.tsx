"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Settings } from "@/features/analytics/store";

async function submit(payload: unknown) {
  try {
    const result = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (result.ok) return true;
    const data = await result.json();
    toast.error(data.error ?? "The change could not be saved.");
  } catch {
    toast.error("The change could not be saved.");
  }
  return false;
}

export function ConfirmationDialog({
  label,
  description,
  run,
}: {
  label: string;
  description: string;
  run: () => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      if (await run()) dialog.current?.close();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </Button>
      <dialog
        ref={dialog}
        aria-label={label}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="surface fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md space-y-4 p-6 text-foreground backdrop:bg-black/65"
      >
        <h2 className="text-xl font-semibold">{label}</h2>
        <p className="text-muted-foreground">{description}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </dialog>
    </>
  );
}

export function UserModeration({
  id,
  suspended,
}: {
  id: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const action = suspended ? "reactivate" : "suspend";
  return (
    <ConfirmationDialog
      label={suspended ? "Reactivate account" : "Suspend account"}
      description={
        suspended
          ? "Restore this account’s ability to sign in."
          : "Revoke existing sessions and block sign-in until this account is reactivated."
      }
      run={async () => {
        if (!(await submit({ action, id }))) return false;
        toast.success(
          suspended ? "Account reactivated." : "Account suspended.",
        );
        router.refresh();
        return true;
      }}
    />
  );
}

export function AdminSettingsForm({ config }: { config: Settings }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    try {
      if (
        await submit({
          action: "settings",
          settings: {
            retentionDays: Number(values.get("retentionDays")),
            dashboardDays: Number(values.get("dashboardDays")),
            searchEnabled: values.has("searchEnabled"),
            activityEnabled: values.has("activityEnabled"),
          },
        })
      ) {
        toast.success("Settings saved.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      onSubmit={save}
      className="surface grid max-w-2xl gap-5 p-6"
    >
      <label className="grid gap-2 font-medium">
        Retention for new events (days)
        <Input
          name="retentionDays"
          type="number"
          min={7}
          max={90}
          defaultValue={config.retentionDays}
          required
        />
      </label>
      <label className="grid gap-2 font-medium">
        Default dashboard range
        <select
          name="dashboardDays"
          defaultValue={config.dashboardDays}
          className="h-12 rounded-xl border border-input bg-background px-3"
        >
          {[7, 30, 90].map((days) => (
            <option key={days} value={days}>
              {days} days
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-3">
        <input
          className="mt-1 accent-primary"
          type="checkbox"
          name="searchEnabled"
          defaultChecked={config.searchEnabled}
        />{" "}
        Collect directory search statistics
      </label>
      <label className="flex items-start gap-3">
        <input
          className="mt-1 accent-primary"
          type="checkbox"
          name="activityEnabled"
          defaultChecked={config.activityEnabled}
        />{" "}
        Record authentication activity
      </label>
      <p className="text-sm text-muted-foreground">
        Search terms come from catalog labels. Identifiable search history
        requires user consent. Audit entries are retained separately.
      </p>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
