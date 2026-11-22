"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  selectClass,
  Workspace,
  useOperation,
  type StudioProps,
} from "./shared";

const WORDS = [
  "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit","sed","do",
  "eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua","enim",
  "ad","minim","veniam","quis","nostrud","exercitation","ullamco","laboris","nisi",
  "aliquip","ex","ea","commodo","consequat","duis","aute","irure","in","reprehenderit",
  "voluptate","velit","esse","cillum","fugiat","nulla","pariatur","excepteur","sint",
  "occaecat","cupidatat","non","proident","sunt","culpa","qui","officia","deserunt",
  "mollit","anim","id","est","laborum","curabitur","pretium","tincidunt","lacus",
  "nunc","pulvinar","sapien","ac","cursus","commodo","tortor","mauris","condimentum",
  "arcu","non","sodales","neque","sodales","ut","etiam","sit","amet","nisl",
];

const BANGLA_WORDS = [
  "বাংলা","ভাষা","সুন্দর","আমার","সোনার","বাংলা","আমি","তোমায়","ভালোবাসি","আকাশ",
  "বাতাস","নদী","মাঠ","ঘাট","ফুল","পাখি","আলো","ছায়া","প্রেম","স্বপ্ন",
  "জীবন","মানুষ","দেশ","মাটি","বৃষ্টি","রোদ","চাঁদ","তারা","মেঘ","হাওয়া",
];

function pickWord(pool: string[], i: number) {
  return pool[i % pool.length];
}

function generateLorem(type: "paragraph" | "sentence" | "word", count: number, bangla: boolean) {
  const pool = bangla ? BANGLA_WORDS : WORDS;
  if (type === "word") {
    return Array.from({ length: count }, (_, i) => pickWord(pool, i + 7)).join(" ");
  }
  const makeSentence = (offset: number) => {
    const len = 8 + (offset % 7);
    const words = Array.from({ length: len }, (_, j) => pickWord(pool, offset + j));
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(" ") + ".";
  };
  if (type === "sentence") {
    return Array.from({ length: count }, (_, i) => makeSentence(i * 11)).join(" ");
  }
  // paragraph
  return Array.from({ length: count }, (_, p) => {
    const sentCount = 4 + (p % 3);
    return Array.from({ length: sentCount }, (_, s) => makeSentence(p * 50 + s * 11)).join(" ");
  }).join("\n\n");
}

export default function LoremIpsum({ slug }: StudioProps) {
  const [type, setType] = useState<"paragraph" | "sentence" | "word">("paragraph");
  const [count, setCount] = useState(3);
  const [bangla, setBangla] = useState(false);
  const { output, error, busy, run, clear } = useOperation<string>(slug);

  return (
    <Workspace
      input={
        <>
          <Field label="Generate">
            <select
              className={selectClass}
              value={type}
              onChange={(e) => { setType(e.target.value as typeof type); clear(); }}
            >
              <option value="paragraph">Paragraphs</option>
              <option value="sentence">Sentences</option>
              <option value="word">Words</option>
            </select>
          </Field>
          <Field label="Count">
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bangla}
              onChange={(e) => { setBangla(e.target.checked); clear(); }}
            />
            Use Bangla placeholder text
          </label>
          <Actions>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void run(() => generateLorem(type, count, bangla))}
            >
              Generate
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setCount(3); clear(); }}>
              Reset
            </Button>
          </Actions>
        </>
      }
      output={
        <>
          {error && <Notice error>{error}</Notice>}
          {output !== undefined ? (
            <>
              <CodeBlock>{output}</CodeBlock>
              <ExportActions value={output} filename="lorem.txt" />
            </>
          ) : (
            !error && <Notice>Click Generate to create placeholder text.</Notice>
          )}
        </>
      }
    />
  );
}
