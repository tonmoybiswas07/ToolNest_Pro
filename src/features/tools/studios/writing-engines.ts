export const promptLabels = {
  title: "Prompt title",
  role: "Role / persona",
  task: "Task description",
  context: "Context",
  constraints: "Constraints",
  format: "Output format",
  exampleInput: "Example input",
  exampleOutput: "Example output",
} as const;
export const blankPrompt = {
  title: "",
  role: "",
  task: "",
  context: "",
  constraints: "",
  format: "",
  exampleInput: "",
  exampleOutput: "",
};
export type Prompt = typeof blankPrompt;
export type Template = { id: string; fields: Prompt };
export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string;
  pinned: boolean;
  updated: number;
};
export const notesLimit = 65536;

export function composePrompt(fields: Prompt) {
  if (!fields.task.trim()) return "";
  const sections = (Object.keys(fields) as (keyof Prompt)[]).filter((key) =>
    fields[key].trim(),
  );
  return (
    sections
      .map((key) =>
        key === "title"
          ? `# ${fields.title.trim()}`
          : `## ${promptLabels[key]}\n${fields[key].trim()}`,
      )
      .join("\n\n") + "\n"
  );
}

export function isTemplates(value: unknown): value is Template[] {
  return (
    Array.isArray(value) &&
    value.length <= 40 &&
    value.every(
      (item) =>
        typeof item?.id === "string" &&
        item.fields &&
        Object.keys(blankPrompt).every(
          (key) =>
            typeof item.fields[key] === "string" &&
            item.fields[key].length <= 6000,
        ),
    )
  );
}

export function isNotes(value: unknown): value is Note[] {
  return (
    Array.isArray(value) &&
    value.length <= 40 &&
    value.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        item.title.length <= 100 &&
        typeof item.content === "string" &&
        item.content.length <= notesLimit &&
        typeof item.tags === "string" &&
        item.tags.length <= 150 &&
        typeof item.pinned === "boolean" &&
        Number.isFinite(item.updated),
    )
  );
}

export function filteredNotes(
  notes: Note[],
  search: string,
  sort: "recent" | "oldest",
) {
  const term = search.trim().toLowerCase();
  return notes
    .filter((note) =>
      [note.title, note.tags, note.content].some((field) =>
        field.toLowerCase().includes(term),
      ),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (sort === "recent" ? b.updated - a.updated : a.updated - b.updated),
    );
}

export function noteFileName(title: string) {
  return (
    (title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "note") + ".md"
  );
}
