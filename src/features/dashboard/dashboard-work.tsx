"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  FileCheck2,
  History,
  Layers3,
  Pin,
  PinOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileSize } from "../tools/file-processing/files";
import { findTool, toolHref } from "../tools/registry";
import { isNotes, isTemplates } from "../tools/studios/writing-engines";
import {
  deviceWorkKey,
  emptyDeviceWork,
  readDeviceWork,
  settingsLabel,
  updateDeviceWork,
} from "./device-work";
import { draftKeys } from "./draft-storage";
import { workflows } from "./workflow-list";

type Draft = { label: string; href: string; group: string };

function savedDrafts(): Draft[] {
  function read(key: string): unknown {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  }
  const notes = read(draftKeys.notes);
  const prompts = read(draftKeys.prompts);
  const gradients = read(draftKeys.gradients);
  const result: Draft[] = [];
  if (isNotes(notes))
    for (const note of [...notes]
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 3)) {
      result.push({
        label: note.title || "Untitled note",
        href: `/tools/smart-notes-studio?draft=${encodeURIComponent(note.id)}`,
        group: "Note",
      });
    }
  if (isTemplates(prompts))
    for (const prompt of prompts.slice(-3).reverse()) {
      result.push({
        label: prompt.fields.title,
        href: `/tools/prompt-builder?draft=${encodeURIComponent(prompt.id)}`,
        group: "Prompt",
      });
    }
  if (Array.isArray(gradients))
    for (const gradient of gradients
      .filter((item) => typeof item?.name === "string")
      .slice(-3)
      .reverse()) {
      result.push({
        label: gradient.name,
        href: `/tools/gradient-studio?draft=${encodeURIComponent(gradient.name)}`,
        group: "Gradient",
      });
    }
  return result;
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof History;
  children: ReactNode;
}) {
  return (
    <section className="surface min-w-0 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Icon className="text-highlight" size={18} aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

export function DashboardWork() {
  const [work, setWork] = useState(emptyDeviceWork);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() {
      setWork(readDeviceWork());
      setDrafts(savedDrafts());
      setReady(true);
    }
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(deviceWorkKey, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(deviceWorkKey, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  if (!ready)
    return (
      <div className="surface h-24" aria-busy="true">
        <span className="sr-only">Loading saved work</span>
      </div>
    );

  const ordered = [...workflows].sort(
    (a, b) =>
      Number(work.pinned.includes(b.id)) - Number(work.pinned.includes(a.id)),
  );
  const muted = "text-sm leading-relaxed text-muted-foreground";
  return (
    <div className="space-y-4">
      <p className={muted}>
        Settings, pinned workflows, drafts, and file totals below are stored on
        this device.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Continue where you left off" icon={History}>
          {work.recent.length ? (
            <ul className="divide-y divide-border">
              {work.recent.map((settings) => {
                const tool = findTool(settings.slug);
                return (
                  tool && (
                    <li key={settings.slug}>
                      <Link
                        className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-accent"
                        href={toolHref(tool) + "?resume=1"}
                      >
                        <span>
                          <span className="block text-sm font-semibold">
                            {tool.name}
                          </span>
                          <span className={muted}>
                            {settingsLabel(settings)}
                          </span>
                        </span>
                        <ArrowRight
                          size={17}
                          className="shrink-0"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  )
                );
              })}
            </ul>
          ) : (
            <p className={muted}>
              Resize an image or compress a PDF to resume with the same settings
              next time.
            </p>
          )}
        </Panel>
        <Panel title="My presets" icon={Bookmark}>
          {work.presets.length ? (
            <ul className="max-h-72 divide-y divide-border overflow-auto">
              {work.presets.map((item) => {
                const tool = findTool(item.settings.slug);
                return (
                  tool && (
                    <li className="flex items-center gap-2 py-2" key={item.id}>
                      <Link
                        className="min-w-0 flex-1 rounded-md p-1 hover:bg-accent"
                        href={toolHref(tool) + "?preset=" + item.id}
                      >
                        <span className="block text-sm font-semibold wrap-anywhere">
                          {item.name}
                        </span>
                        <span className={muted}>
                          {tool.name} · {settingsLabel(item.settings)}
                        </span>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            !updateDeviceWork((data) => ({
                              ...data,
                              presets: data.presets.filter(
                                (preset) => preset.id !== item.id,
                              ),
                            }))
                          )
                            toast.error("Could not remove this preset.");
                        }}
                        aria-label={`Remove ${item.name} preset`}
                      >
                        Remove
                      </Button>
                    </li>
                  )
                );
              })}
            </ul>
          ) : (
            <p className={muted}>
              Save a named preset from Image Resizer or PDF Compressor.
            </p>
          )}
        </Panel>
        <Panel title="My workflows" icon={Layers3}>
          <ul className="divide-y divide-border">
            {ordered.map((workflow) => {
              const pinned = work.pinned.includes(workflow.id);
              const Icon = pinned ? PinOff : Pin;
              return (
                <li key={workflow.id} className="flex items-center gap-2 py-2">
                  <Link
                    className="min-w-0 flex-1 rounded-md p-1 hover:bg-accent"
                    href={`/dashboard/workflows/${workflow.id}`}
                  >
                    <span className="block text-sm font-semibold">
                      {workflow.title}
                    </span>
                    <span className={muted}>{workflow.description}</span>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${pinned ? "Unpin" : "Pin"} ${workflow.title}`}
                    aria-pressed={pinned}
                    onClick={() => {
                      if (
                        !updateDeviceWork((data) => ({
                          ...data,
                          pinned: data.pinned.includes(workflow.id)
                            ? data.pinned.filter((id) => id !== workflow.id)
                            : [...data.pinned, workflow.id],
                        }))
                      )
                        toast.error("Could not update pinned workflows.");
                    }}
                  >
                    <Icon size={16} aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Local drafts" icon={BookmarkCheck}>
          {drafts.length ? (
            <ul className="max-h-72 divide-y divide-border overflow-auto">
              {drafts.map((draft) => (
                <li key={draft.href}>
                  <Link
                    href={draft.href}
                    className="flex items-center justify-between gap-2 rounded-md p-2 text-sm hover:bg-accent"
                  >
                    <span className="min-w-0 wrap-anywhere">{draft.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {draft.group}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={muted}>
              Saved notes, prompt templates, and gradient presets will appear
              here.
            </p>
          )}
        </Panel>
      </div>
      <Panel title="File results on this device" icon={FileCheck2}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className={muted}>Output files created</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {work.results.files.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className={muted}>Size saved on smaller outputs</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {fileSize(work.results.saved)}
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
