"use client";

import dynamic from "next/dynamic";
import { StudentSkeleton } from "./workspace";

const Assignments = dynamic(
  () => import("./academics").then((m) => m.Assignments),
  { loading: StudentSkeleton, ssr: false },
);
const Routine = dynamic(() => import("./academics").then((m) => m.Routine), {
  loading: StudentSkeleton,
  ssr: false,
});
const Attendance = dynamic(
  () => import("./academics").then((m) => m.Attendance),
  { loading: StudentSkeleton, ssr: false },
);
const Grades = dynamic(() => import("./academics").then((m) => m.Grades), {
  loading: StudentSkeleton,
  ssr: false,
});
const Pomodoro = dynamic(
  () => import("./productivity").then((m) => m.Pomodoro),
  { loading: StudentSkeleton, ssr: false },
);
const Flashcards = dynamic(
  () => import("./productivity").then((m) => m.Flashcards),
  { loading: StudentSkeleton, ssr: false },
);
const Exams = dynamic(() => import("./productivity").then((m) => m.Exams), {
  loading: StudentSkeleton,
  ssr: false,
});
const Citations = dynamic(
  () => import("./documents").then((m) => m.Citations),
  { loading: StudentSkeleton, ssr: false },
);
const OCR = dynamic(() => import("./documents").then((m) => m.OCR), {
  loading: StudentSkeleton,
  ssr: false,
});
const Summarizer = dynamic(
  () => import("./documents").then((m) => m.Summarizer),
  { loading: StudentSkeleton, ssr: false },
);

export function StudentTool({
  slug,
  configured,
  signedIn,
}: {
  slug: string;
  configured: boolean;
  signedIn: boolean;
}) {
  switch (slug) {
    case "assignment-tracker":
      return <Assignments />;
    case "class-routine-maker":
      return <Routine />;
    case "attendance-tracker":
      return <Attendance />;
    case "cgpa-calculator":
      return <Grades />;
    case "pomodoro-timer":
      return <Pomodoro />;
    case "flashcard-maker":
      return <Flashcards />;
    case "exam-study-planner":
      return <Exams />;
    case "citation-generator":
      return <Citations />;
    case "ocr-image-to-text":
      return <OCR />;
    case "ai-notes-summarizer":
      return <Summarizer configured={configured} signedIn={signedIn} />;
    default:
      return null;
  }
}
