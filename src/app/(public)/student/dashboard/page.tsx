import { preferences } from "@/features/analytics/personal";
import { StudentDashboard } from "@/features/student/dashboard";
import { loadStudent } from "@/features/student/server";
import { StudentWorkspace } from "@/features/student/workspace";
export const metadata = { title: "Student dashboard" };
export default async function Page() {
  const snapshot = await loadStudent();
  const favorites = snapshot.owner
    ? ((await preferences().findOne({ _id: `user:${snapshot.owner}` }))
        ?.favorites ?? [])
    : [];
  return (
    <>
      <h1 className="mb-3 student-display text-3xl sm:text-4xl">
        Academic overview
      </h1>
      <StudentWorkspace snapshot={snapshot}>
        <StudentDashboard favorites={favorites} />
      </StudentWorkspace>
    </>
  );
}
