import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="shell section-space">
      <div role="status" className="mb-6 flex items-center gap-3 text-muted-foreground">
        <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden /> Loading page…
      </div>
      <div aria-hidden className="card-grid">
        {[0, 1, 2].map((placeholder) => <div key={placeholder} className="surface h-44 bg-accent/45 motion-safe:animate-pulse" />)}
      </div>
    </div>
  );
}
