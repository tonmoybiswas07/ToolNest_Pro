"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendAnalytics } from "./client";

export function PrivacyControls({ consent }: { consent: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function update(remove = false) {
    setPending(true);
    try {
      const response = await sendAnalytics(remove ? { type: "delete_history" } : { type: "consent", enabled: !consent });
      if (!response.ok) throw new Error();
      toast.success(remove ? "Personal search history deleted." : "Search preference saved.");
      router.refresh();
    } catch {
      toast.error("Could not save your privacy preference.");
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-3">
    <Button type="button" variant="outline" disabled={pending} onClick={() => update()}>{consent ? "Turn off personal search history" : "Opt in to personal search history"}</Button>
    <Button type="button" variant="ghost" disabled={pending} onClick={() => {
      if (window.confirm("Delete your personal search history and turn off future collection?")) void update(true);
    }}>Delete personal search history</Button>
  </div>;
}
