import { Cite, plugins, type CSL } from "@citation-js/core";
import "@citation-js/plugin-csl";

export type CitationStyle = "apa" | "mla" | "ieee";

export function formatReferences(
  items: CSL[],
  style: CitationStyle,
  styleXml?: string,
) {
  if (styleXml) plugins.config.get("@csl").styles.add(style, styleXml);
  const cite = new Cite(items);
  const options = { style, lang: "en-US" };
  return {
    bibliography: cite
      .format("bibliography", { ...options, format: "text" })
      .trim(),
    html: cite.format("bibliography", { ...options, format: "html" }),
    inText: items.map((item, index) => ({
      id: item.id,
      value: cite
        .format("citation", {
          ...options,
          format: "text",
          entry: String(item.id),
          citationsPre: items.slice(0, index).map((row) => String(row.id)),
          citationsPost: items.slice(index + 1).map((row) => String(row.id)),
        })
        .trim(),
    })),
  };
}
