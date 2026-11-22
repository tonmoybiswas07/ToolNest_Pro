"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function useConfirm(): ConfirmFunction {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFunction>((opts) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setOpen(true);
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
      function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose(false);
        }
      }
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [open, handleClose]);

  const isDestructive = options.destructive ?? false;
  const Icon = isDestructive ? AlertTriangle : HelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => handleClose(false)}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                  isDestructive
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-primary/30 bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    id="confirm-dialog-title"
                    className="text-base font-semibold text-foreground truncate"
                  >
                    {options.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Close dialog"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {options.description && (
                  <p
                    id="confirm-dialog-desc"
                    className="mt-2 text-sm text-muted-foreground leading-relaxed"
                  >
                    {options.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
              >
                {options.cancelText || "Cancel"}
              </Button>
              <Button
                ref={confirmBtnRef}
                type="button"
                variant={isDestructive ? "destructive" : "default"}
                size="sm"
                onClick={() => handleClose(true)}
              >
                {options.confirmText || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
