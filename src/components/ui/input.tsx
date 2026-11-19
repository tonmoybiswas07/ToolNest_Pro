import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn("h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-65", className)} {...props} />;
}
