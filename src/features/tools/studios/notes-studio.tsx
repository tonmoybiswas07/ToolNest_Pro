"use client";

import { draftKeys, localDraftId } from "@/features/dashboard/draft-storage";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filteredNotes,
  isNotes,
  noteFileName,
  notesLimit,
  type Note,
} from "./writing-engines";
import {
  Actions,
  ExportActions,
  Field,
  Notice,
  readLocalFile,
  readStorage,
  saveStorage,
  selectClass,
  TextArea,
  trackOperation,
  Workspace,
  type StudioProps,
} from "./shared";

const storageKey = draftKeys.notes;

export default function NotesStudio({ slug }: StudioProps) {
  const [notes, setNotes] = useState(() =>
    readStorage(storageKey, isNotes, []),
  );
  const [selected, setSelected] = useState(() => notes.find(item => item.id === localDraftId())?.id ?? notes[0]?.id);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [storageError, setStorageError] = useState(false);
  const [dirtyPreview, setDirtyPreview] = useState(false);
  const draft = useRef<Note[] | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const note = notes.find((item) => item.id === selected);
  const content = note?.content ?? "";
  const preview = useDeferredValue(content);
  const visible = filteredNotes(notes, search, sort);

  useEffect(() => {
    if (!dirtyPreview || !preview.trim() || preview !== content) return;
    const timer = window.setTimeout(() => trackOperation(slug, true), 750);
    return () => window.clearTimeout(timer);
  }, [content, dirtyPreview, preview, slug]);

  useEffect(() => {
    function flushDraft() {
      window.clearTimeout(timer.current);
      if (!draft.current) return;
      if (saveStorage(storageKey, draft.current)) draft.current = null;
    }
    window.addEventListener("pagehide", flushDraft);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      flushDraft();
    };
  }, []);

  function persist(next: Note[]) {
    window.clearTimeout(timer.current);
    draft.current = null;
    const saved = saveStorage(storageKey, next);
    setStorageError(!saved);
    setNotes(next);
    return saved;
  }

  function add(title = "Untitled note", markdown = "") {
    if (notes.length >= 40) {
      toast.error("Delete a note before adding another.");
      return;
    }
    const id = crypto.randomUUID();
    persist([
      ...notes,
      {
        id,
        title,
        content: markdown,
        tags: "",
        pinned: false,
        updated: Date.now(),
      },
    ]);
    setSelected(id);
    setDirtyPreview(Boolean(markdown.trim()));
  }

  function edit(fields: Partial<Note>) {
    if (!note) return;
    const next = notes.map((item) =>
      item.id === note.id ? { ...item, ...fields, updated: Date.now() } : item,
    );
    setNotes(next);
    draft.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (saveStorage(storageKey, next)) {
        draft.current = null;
        setStorageError(false);
      } else setStorageError(true);
    }, 300);
    if (fields.content !== undefined) setDirtyPreview(true);
  }

  return (
    <Workspace
      input={
        <>
          <Actions>
            <Button type="button" onClick={() => add()}>
              New note
            </Button>
            <label className="block text-sm font-medium">
              Import Markdown
              <input
                className="mt-2 block max-w-full text-sm"
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    add(
                      file.name.replace(/\.[^.]+$/, "").slice(0, 100) ||
                        "Imported note",
                      await readLocalFile(file, notesLimit),
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Import failed.",
                    );
                    trackOperation(slug, false);
                  }
                }}
              />
            </label>
          </Actions>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Search notes">
              <Input
                type="search"
                value={search}
                maxLength={120}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <Field label="Sort by updated date">
              <select
                className={selectClass}
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value === "oldest" ? "oldest" : "recent")
                }
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </Field>
          </div>
          {visible.length ? (
            <ul className="grid max-h-48 gap-2 overflow-auto">
              {visible.map((item) => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant={item.id === selected ? "default" : "outline"}
                    aria-pressed={item.id === selected}
                    className="h-auto w-full justify-start whitespace-normal wrap-break-word py-2 text-left"
                    onClick={() => {
                      setSelected(item.id);
                      setDirtyPreview(false);
                    }}
                  >
                    {item.pinned ? "Pinned · " : ""}
                    {item.title || "Untitled note"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Notice>
              {notes.length
                ? "No notes match your search."
                : "Create or import a note."}
            </Notice>
          )}
          {note && (
            <>
              <Field label="Note title">
                <Input
                  value={note.title}
                  maxLength={100}
                  onChange={(event) => edit({ title: event.target.value })}
                />
              </Field>
              <Field label="Tags (comma-separated)">
                <Input
                  value={note.tags}
                  maxLength={150}
                  onChange={(event) => edit({ tags: event.target.value })}
                />
              </Field>
              <Field label="Markdown">
                <TextArea
                  className="min-h-48 font-mono"
                  value={note.content}
                  maxLength={notesLimit}
                  onChange={(event) => edit({ content: event.target.value })}
                />
              </Field>
              <Actions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => edit({ pinned: !note.pinned })}
                >
                  {note.pinned ? "Unpin note" : "Pin note"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!content}
                  onClick={() => {
                    if (window.confirm("Clear the Markdown in this note?")) {
                      edit({ content: "" });
                      setDirtyPreview(false);
                    }
                  }}
                >
                  Clear Markdown
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm("Delete this note from this device?"))
                      return;
                    const next = notes.filter((item) => item.id !== note.id);
                    if (persist(next)) {
                      setSelected(next[0]?.id);
                      setDirtyPreview(false);
                      toast.success("Note deleted.");
                    }
                  }}
                >
                  Delete note
                </Button>
              </Actions>
            </>
          )}
          {storageError ? (
            <Notice error>
              Local saving failed. Export your changes before leaving this page.
            </Notice>
          ) : (
            <Notice>Notes save automatically on this device.</Notice>
          )}
        </>
      }
      output={
        <>
          {note ? (
            <>
              <h3 className="wrap-break-word font-semibold">
                {note.title || "Untitled note"}
              </h3>
              {note.tags && (
                <ul aria-label="Note tags" className="flex flex-wrap gap-2">
                  {[
                    ...new Set(
                      note.tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    ),
                  ].map((tag) => (
                    <li className="status-pill wrap-break-word" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              {preview.trim() ? (
                <article
                  aria-label="Markdown preview"
                  className="max-h-128 space-y-3 overflow-auto wrap-break-word rounded-xl border border-border bg-background p-4 text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-accent [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
                >
                  <Markdown
                    skipHtml
                    components={{
                      img: ({ alt }) => (
                        <span>{alt ? `[Image: ${alt}]` : "[Image]"}</span>
                      ),
                      a: ({ children, href }) =>
                        href && /^(?:https?:|mailto:)/i.test(href) ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-highlight underline"
                          >
                            {children}
                          </a>
                        ) : (
                          <span>{children}</span>
                        ),
                    }}
                  >
                    {preview}
                  </Markdown>
                </article>
              ) : (
                <Notice>Write Markdown to see the live preview.</Notice>
              )}
              <ExportActions
                value={note.content}
                filename={noteFileName(note.title)}
                type="text/markdown;charset=utf-8"
                label="Copy Markdown"
              />
            </>
          ) : (
            <Notice>Select a note to preview it.</Notice>
          )}
        </>
      }
    />
  );
}
