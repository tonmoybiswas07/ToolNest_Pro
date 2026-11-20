import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolControls } from "@/features/analytics/tool-controls";
import { loadStudent } from "@/features/student/server";
import { StudentTool } from "@/features/student/tools";
import { StudentWorkspace } from "@/features/student/workspace";
import { studentTools } from "@/features/tools/registry";

type Props = { params: Promise<{ slug: string }> };
function getTool(slug: string) {
  return studentTools.find((tool) => tool.slug === slug) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return { title: tool.name, description: tool.description };
}

export default async function Page({ params }: Props) {
  const tool = getTool((await params).slug);
  const snapshot = await loadStudent();
  const configured = Boolean(
    process.env.STUDENT_OPENAI_API_KEY && process.env.STUDENT_OPENAI_MODEL,
  );
  return (
    <>
      <header className="student-masthead mb-6 flex flex-wrap items-start justify-between gap-4 p-5 sm:p-8">
        <div>
          <span className="student-tool-icon mb-3">
            <tool.icon size={22} aria-hidden />
          </span>
          <h1 className="student-display text-3xl sm:text-4xl">
            {tool.name}
          </h1>
          <p className="mt-2 text-muted-foreground">{tool.description}</p>
        </div>
        <ToolControls slug={tool.slug} />
      </header>
      <StudentWorkspace key={tool.slug} snapshot={snapshot} slug={tool.slug}>
        <StudentTool
          slug={tool.slug}
          configured={configured}
          signedIn={!!snapshot.owner}
        />
      </StudentWorkspace>
    </>
  );
}
