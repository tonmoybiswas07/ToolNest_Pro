"use client";

import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";

export type Language = "text" | "json" | "javascript" | "typescript";

export function languageMode(language: Language) {
  if (language === "json") return json();
  if (language === "text") return [];
  return javascript({ typescript: language === "typescript", jsx: true });
}

export const editorTheme = EditorView.theme({
  "&": {
    color: "var(--foreground)",
    backgroundColor: "var(--background)",
    fontSize: "0.875rem",
  },
  ".cm-scroller": { overflow: "auto", maxHeight: "26rem", minHeight: "10rem" },
  ".cm-content": { caretColor: "var(--foreground)" },
  ".cm-gutters": {
    backgroundColor: "var(--card)",
    color: "var(--muted-foreground)",
    borderColor: "var(--border)",
  },
  "&.cm-focused": {
    outline: "2px solid var(--highlight)",
    outlineOffset: "-2px",
  },
});

export function editorExtensions(language: Language, label: string) {
  return [
    editorTheme,
    lineNumbers(),
    syntaxHighlighting(defaultHighlightStyle),
    languageMode(language),
    EditorView.contentAttributes.of({
      "aria-label": label,
      spellcheck: "false",
    }),
  ];
}

export function Editor({
  label,
  language,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  language: Language;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  const mode = useRef(new Compartment());
  const initial = useRef({ label, language, value, onChange, maxLength });

  useEffect(() => {
    const config = initial.current;
    const editor = new EditorView({
      parent: host.current ?? undefined,
      doc: config.value,
      extensions: [
        ...editorExtensions("text", config.label),
        mode.current.of(languageMode(config.language)),
        keymap.of([{ key: "Tab", run: () => false }]),
        EditorState.changeFilter.of(
          (transaction) =>
            transaction.newDoc.length <= config.maxLength ||
            transaction.newDoc.length < transaction.startState.doc.length,
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) config.onChange(update.state.doc.toString());
        }),
      ],
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: mode.current.reconfigure(languageMode(language)),
    });
  }, [language]);

  return (
    <div className="min-w-0">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div
        ref={host}
        className="overflow-hidden rounded-xl border border-input"
      />
    </div>
  );
}
