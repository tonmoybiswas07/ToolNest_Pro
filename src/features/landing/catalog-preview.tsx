"use client";

import { motion } from "motion/react";
import { Layers3 } from "lucide-react";
import { categories, type CategoryId } from "@/features/tools/registry";

const previewCategories: CategoryId[] = ["image", "document", "developer", "text", "design", "student"];

export function CatalogPreview() {
  return (
    <motion.div className="catalog-art" aria-hidden="true" initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.65, ease: "easeOut" }}>
      <div className="catalog-orbit catalog-orbit-outer" />
      <div className="catalog-orbit catalog-orbit-inner" />
      <div className="catalog-window">
        <div className="catalog-window-header">
          <span className="brand-mark"><Layers3 size={15} /></span>
          <span>Toolkit catalog</span>
          <span className="ml-auto flex gap-1.5"><i /><i /><i /></span>
        </div>
        <div className="catalog-window-grid">
          {previewCategories.map((id) => {
            const { icon: Icon, tone, name } = categories[id];
            return (
              <div className="catalog-tile" key={id}>
                <span className="tile-icon" data-tone={tone}><Icon size={17} /></span>
                <span>{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
