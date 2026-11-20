import { StudentDirectory } from "@/features/student/directory";
export const metadata = { title: "Student tools" };
export default function Page() {
  return (
    <>
      <h1 className="mb-6 student-display text-3xl sm:text-4xl">
        Student tools
      </h1>
      <StudentDirectory />
    </>
  );
}
