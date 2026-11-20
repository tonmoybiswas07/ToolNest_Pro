"use client";

import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="surface p-6" role="alert">
      <h1 className="text-xl font-semibold">Student Hub could not load</h1>
      <p className="my-3 text-sm text-muted-foreground">
        Try again in a moment.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
