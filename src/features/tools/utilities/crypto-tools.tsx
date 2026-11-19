"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  CodeBlock,
  copyText,
  downloadFile,
  Field,
  Notice,
  selectClass,
  TextArea,
  useOperation,
  type StudioProps,
} from "../studios/shared";
import { Utility, TextOutput } from "./interface";
import {
  characterGroups,
  generatePasswords,
  generateUuids,
  hashAlgorithms,
  hashFileLimit,
  hashInput,
  uuidExport,
  validateUuid,
  type CharacterGroup,
  type HashAlgorithm,
} from "./crypto-engines";

export function HashTool({ slug }: StudioProps) {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [checksum, setChecksum] = useState("");
  const job = useOperation<Awaited<ReturnType<typeof hashInput>>>(slug);
  return (
    <Utility
      job={job}
      label="Generate hash"
      submit={() =>
        void job.run(() => {
          if (mode === "file" && !file)
            throw new Error("Choose a local file to hash.");
          return hashInput(
            mode === "file" && file ? file : text,
            algorithm,
            checksum,
          );
        })
      }
      reset={() => {
        setAlgorithm("SHA-256");
        setMode("text");
        setText("");
        setFile(undefined);
        setChecksum("");
      }}
      fields={
        <>
          <Field label="Hash source">
            <select
              className={selectClass}
              value={mode}
              onChange={(event) => {
                setMode(event.target.value);
                setFile(undefined);
                job.clear();
              }}
            >
              <option value="text">UTF-8 text</option>
              <option value="file">Local file</option>
            </select>
          </Field>
          <Field label="Algorithm">
            <select
              className={selectClass}
              value={algorithm}
              onChange={(event) =>
                setAlgorithm(event.target.value as HashAlgorithm)
              }
            >
              {hashAlgorithms.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          {mode === "text" ? (
            <Field label="Text to hash">
              <TextArea
                value={text}
                maxLength={100000}
                onChange={(event) => setText(event.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label="Choose a file">
                <Input
                  type="file"
                  className="pt-2"
                  onChange={(event) => {
                    setFile(event.target.files?.[0]);
                    event.target.value = "";
                    job.clear();
                  }}
                />
              </Field>
              <Notice>
                Files up to 16 MB are read in this browser for hashing.
              </Notice>
              {file && (
                <Notice error={file.size > hashFileLimit}>
                  {file.size > hashFileLimit
                    ? "This file exceeds 16 MB."
                    : `Selected: ${file.name}`}
                </Notice>
              )}
            </>
          )}
          <Field label="Expected hexadecimal checksum (optional)">
            <Input
              value={checksum}
              maxLength={128}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setChecksum(event.target.value)}
            />
          </Field>
        </>
      }
      render={(result) => (
        <>
          {result.matches !== null && (
            <Notice>
              {result.matches
                ? "The checksum matches."
                : "The checksum does not match."}
            </Notice>
          )}
          <TextOutput
            value={result.hex}
            filename={`toolnest-${result.algorithm.toLowerCase()}.txt`}
            label="Copy hash"
          />
        </>
      )}
    />
  );
}

const groupLabels: Record<CharacterGroup, string> = {
  uppercase: "Uppercase",
  lowercase: "Lowercase",
  numbers: "Numbers",
  symbols: "Symbols",
};
const allGroups = Object.keys(characterGroups) as CharacterGroup[];

export function PasswordTool({ slug }: StudioProps) {
  const [length, setLength] = useState("20");
  const [count, setCount] = useState("1");
  const [groups, setGroups] = useState<CharacterGroup[]>(allGroups);
  const [exclude, setExclude] = useState(true);
  const [requireEach, setRequireEach] = useState(true);
  const job = useOperation<string[]>(slug);
  return (
    <Utility
      job={job}
      label={job.output ? "Regenerate passwords" : "Generate passwords"}
      submit={() =>
        void job.run(() =>
          generatePasswords({
            length: Number(length),
            count: Number(count),
            groups,
            excludeAmbiguous: exclude,
            requireEach,
          }),
        )
      }
      reset={() => {
        setLength("20");
        setCount("1");
        setGroups(allGroups);
        setExclude(true);
        setRequireEach(true);
      }}
      fields={
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Password length">
              <Input
                type="number"
                min={4}
                max={256}
                value={length}
                onChange={(event) => setLength(event.target.value)}
              />
            </Field>
            <Field label="Number of passwords">
              <Input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </Field>
          </div>
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="mb-2 font-semibold">Character groups</legend>
            {allGroups.map((group) => (
              <label className="flex items-center gap-2" key={group}>
                <input
                  type="checkbox"
                  checked={groups.includes(group)}
                  onChange={(event) =>
                    setGroups(
                      event.target.checked
                        ? [...groups, group]
                        : groups.filter((item) => item !== group),
                    )
                  }
                />
                {groupLabels[group]}
              </label>
            ))}
          </fieldset>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={exclude}
              onChange={(event) => setExclude(event.target.checked)}
            />{" "}
            Exclude ambiguous characters such as 0, O, 1 and l
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={requireEach}
              onChange={(event) => setRequireEach(event.target.checked)}
            />{" "}
            Require at least one from each selected group
          </label>
          <Notice>
            Generated passwords stay on this page until you copy them. Reset
            clears the displayed list.
          </Notice>
        </>
      }
      render={(values) => (
        <ol
          aria-label="Generated passwords"
          className="max-h-112 space-y-3 overflow-y-auto"
        >
          {values.map((value, index) => (
            <li className="space-y-2" key={index}>
              <CodeBlock>{value}</CodeBlock>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyText(value)}
                aria-label={`Copy password ${index + 1}`}
              >
                Copy password {index + 1}
              </Button>
            </li>
          ))}
        </ol>
      )}
    />
  );
}

type UuidResult = { values: string[] } | { message: string };

export function UuidTool({ slug }: StudioProps) {
  const [mode, setMode] = useState("generate");
  const [count, setCount] = useState("1");
  const [uppercase, setUppercase] = useState(false);
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<"txt" | "csv" | "json">("txt");
  const job = useOperation<UuidResult>(slug);
  return (
    <Utility
      job={job}
      label={mode === "generate" ? "Generate UUID v4" : "Validate UUID"}
      submit={() =>
        void job.run(() =>
          mode === "generate"
            ? { values: generateUuids(Number(count), uppercase) }
            : { message: validateUuid(input) },
        )
      }
      reset={() => {
        setMode("generate");
        setCount("1");
        setUppercase(false);
        setInput("");
        setFormat("txt");
      }}
      fields={
        <>
          <Field label="UUID operation">
            <select
              className={selectClass}
              value={mode}
              onChange={(event) => {
                setMode(event.target.value);
                job.clear();
              }}
            >
              <option value="generate">Generate UUID v4</option>
              <option value="validate">Validate a UUID</option>
            </select>
          </Field>
          {mode === "generate" ? (
            <>
              <Field label="Number of UUIDs">
                <Input
                  type="number"
                  value={count}
                  min={1}
                  max={1000}
                  onChange={(event) => setCount(event.target.value)}
                />
              </Field>
              <Field label="Letter case">
                <select
                  className={selectClass}
                  value={uppercase ? "upper" : "lower"}
                  onChange={(event) =>
                    setUppercase(event.target.value === "upper")
                  }
                >
                  <option value="lower">Lowercase</option>
                  <option value="upper">Uppercase</option>
                </select>
              </Field>
            </>
          ) : (
            <Field label="UUID to validate">
              <Input
                value={input}
                maxLength={48}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => setInput(event.target.value)}
              />
            </Field>
          )}
        </>
      }
      render={(result) =>
        "message" in result ? (
          <TextOutput value={result.message} label="Copy validation result" />
        ) : (
          <>
            <Notice>{result.values.length} generated.</Notice>
            <CodeBlock>{result.values.join("\n")}</CodeBlock>
            <Field label="Export format">
              <select
                className={selectClass}
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as typeof format)
                }
              >
                <option value="txt">TXT</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </Field>
            <Actions>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyText(result.values.join("\n"))}
              >
                {result.values.length === 1 ? "Copy UUID" : "Copy UUIDs"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadFile(
                    `toolnest-uuids.${format}`,
                    uuidExport(result.values, format),
                    {
                      txt: "text/plain;charset=utf-8",
                      csv: "text/csv;charset=utf-8",
                      json: "application/json",
                    }[format],
                  )
                }
              >
                Download {format.toUpperCase()}
              </Button>
            </Actions>
          </>
        )
      }
    />
  );
}
