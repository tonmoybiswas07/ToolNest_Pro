"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isToolSettings,
  updateDeviceWork,
  type ToolSettings,
} from "./device-work";

export function SavePreset({ settings }: { settings: ToolSettings }) {
  const [name, setName] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const title = name.trim();
    if (!title || !isToolSettings(settings)) return;
    const saved = updateDeviceWork((work) => ({
      ...work,
      presets: [
        { id: crypto.randomUUID(), name: title, settings },
        ...work.presets,
      ],
    }));
    if (saved) {
      setName("");
      toast.success("Preset saved on this device.");
    } else toast.error("Could not save this preset. Your library may be full.");
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3"
    >
      <label className="min-w-0 flex-1 text-sm font-medium">
        Preset name
        <Input
          className="mt-1"
          maxLength={70}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Application photo"
          required
        />
      </label>
      <Button
        type="submit"
        variant="outline"
        disabled={!name.trim() || !isToolSettings(settings)}
      >
        Save preset
      </Button>
    </form>
  );
}
