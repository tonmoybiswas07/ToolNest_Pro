"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { PageState } from "@/components/site/page-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="flex flex-1">
      <PageState
        icon={<CircleAlert size={23} aria-hidden />}
        title="Something went wrong"
        description="There was a problem loading this page."
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </PageState>
    </main>
  );
}
