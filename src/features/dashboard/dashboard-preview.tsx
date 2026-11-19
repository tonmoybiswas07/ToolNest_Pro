import { LayoutDashboard, Shield } from "lucide-react";

export function DashboardPreview({ admin = false }: { admin?: boolean }) {
  const Icon = admin ? Shield : LayoutDashboard;

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">{admin ? "Admin dashboard" : "Your dashboard"}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{admin ? "The future home for catalog and account management." : "The future home for your ToolNest Pro activity."}</p>
      <section className="surface mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="tile-icon"><Icon size={23} aria-hidden /></span>
        <div>
          <h2 className="text-xl font-semibold">Coming Soon</h2>
          <p className="mt-1 text-muted-foreground">This dashboard is a layout preview.</p>
        </div>
      </section>
    </div>
  );
}
