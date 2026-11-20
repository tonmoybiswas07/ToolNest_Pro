export const draftKeys = {
  notes: "toolnest-notes-v1",
  prompts: "toolnest-prompt-templates-v1",
  gradients: "toolnest-gradient-presets-v1",
};

export function localDraftId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("draft");
}
