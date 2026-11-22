"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Moon, Sun, ArrowRight, X } from "lucide-react";
import { tools, categories } from "@/features/tools/registry";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Global keyboard listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!open) {
          setQuery("");
          setSelectedIndex(0);
        }
        setOpen(!open);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "d"
      ) {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setTheme, theme]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // Quick navigation pages
    list.push(
      {
        id: "nav-home",
        title: "Home",
        description: "Return to ToolNest Pro homepage",
        category: "Navigation",
        onSelect: () => router.push("/"),
      },
      {
        id: "nav-tools",
        title: "Explore Tools Catalog",
        description: "Browse digital and academic tools",
        category: "Navigation",
        onSelect: () => router.push("/tools"),
      },
      {
        id: "nav-student",
        title: "Student Hub",
        description: "Routines, flashcards, GPA calculator, and study planner",
        category: "Navigation",
        onSelect: () => router.push("/student"),
      },
      {
        id: "nav-dashboard",
        title: "User Dashboard",
        description: "View recent activity, favorites, and saved presets",
        category: "Navigation",
        onSelect: () => router.push("/dashboard"),
      },
    );

    // Theme toggles
    list.push({
      id: "action-theme",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      description: "Toggle app appearance",
      category: "Appearance",
      icon: theme === "dark" ? Sun : Moon,
      onSelect: () => setTheme(theme === "dark" ? "light" : "dark"),
    });

    // All tools
    for (const tool of tools) {
      const cat = categories[tool.category];
      list.push({
        id: `tool-${tool.slug}`,
        title: tool.name,
        description: tool.description,
        category: cat?.name || "Tools",
        icon: tool.icon,
        onSelect: () => router.push(`/tools/${tool.slug}`),
      });
    }

    if (!query.trim()) {
      return list;
    }

    const q = query.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query, router, theme, setTheme]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter" && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].onSelect();
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 sm:pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tools, pages, or actions... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="ml-2 hidden rounded border border-border bg-accent px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2 focus:outline-none"
          tabIndex={-1}
        >
          {items.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No matching tools or actions found for &ldquo;{query}&rdquo;.
            </li>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon || ArrowRight;
              const isSelected = index === selectedIndex;
              return (
                <li
                  key={item.id}
                  onClick={() => {
                    item.onSelect();
                    setOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                        isSelected
                          ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                          : "border-border bg-accent text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p
                          className={cn(
                            "truncate text-xs",
                            isSelected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-accent text-muted-foreground border border-border"
                    )}
                  >
                    {item.category}
                  </span>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-border bg-accent/40 px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-border bg-card px-1">↑</kbd>{" "}
              <kbd className="rounded border border-border bg-card px-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="rounded border border-border bg-card px-1.5">↵</kbd> to select
            </span>
          </div>
          <span>ToolNest Pro Quick Search</span>
        </div>
      </div>
    </div>
  );
}
