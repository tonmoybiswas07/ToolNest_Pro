import { loadStudent } from "@/features/student/server";
import { StudentSettings } from "@/features/student/settings";
import { StudentWorkspace } from "@/features/student/workspace";
export const metadata = { title: "Student settings" };
export default async function Page() {
  const snapshot = await loadStudent();
  return (
    <>
      <h1 className="mb-3 student-display text-3xl sm:text-4xl">
        Student settings
      </h1>
      <StudentWorkspace snapshot={snapshot}>
        <StudentSettings />
      </StudentWorkspace>
    </>
  );
}
