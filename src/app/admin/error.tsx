"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="surface space-y-3 p-6">
      <h1 className="text-xl font-semibold">Administration data unavailable</h1>
      <p className="text-muted-foreground">Try loading the page again.</p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </section>
  );
}
