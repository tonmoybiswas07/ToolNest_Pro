import type { ReactNode } from "react";

export function PageState({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="shell grid min-h-[62vh] flex-1 place-items-center py-12">
      <div className="surface grid w-full max-w-lg justify-items-center gap-4 p-6 text-center sm:p-10">
        <span className="tile-icon">{icon}</span>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}
