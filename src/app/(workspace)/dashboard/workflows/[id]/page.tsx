import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceWorkflow } from "@/features/dashboard/workspace-workflow";
import { workflows } from "@/features/dashboard/workflow-list";
import { requireSession } from "@/lib/session";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const workflow = workflows.find((item) => item.id === id);
  if (!workflow) notFound();

  return (
    <div className="max-w-6xl">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-highlight underline"
      >
        Back to dashboard
      </Link>
      <h1 className="page-title mt-3">{workflow.title}</h1>
      <p className="mt-2 text-muted-foreground">{workflow.description}</p>
      <WorkspaceWorkflow key={id} id={workflow.id} />
    </div>
  );
}
