import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { formatReferences } from "../src/features/student/citations.ts";
import {
  attendanceStats,
  dateAt,
  emptyStudent,
  gradeStats,
  localInstant,
  minutesLeft,
  reviewCard,
  studentSchema,
  toInstant,
} from "../src/features/student/model.ts";

const course = {
  id: randomUUID(),
  name: "Physics",
  code: "PHY101",
  color: "#6366f1",
};
const classRow = {
  id: randomUUID(),
  course: course.id,
  instructor: "",
  building: "",
  room: "",
  day: 1,
  type: "Lecture",
  start: "09:00",
  end: "10:00",
};
const workspace = { ...emptyStudent, courses: [course] };
const accepts = (data) => studentSchema.safeParse(data).success;

test("student validation protects scheduled time and shared course references", () => {
  assert.ok(accepts(workspace));
  assert.ok(
    !accepts({
      ...workspace,
      courses: [course, { ...course, id: randomUUID(), code: "phy101" }],
    }),
  );
  assert.ok(
    !accepts({
      ...workspace,
      classes: [{ ...classRow, course: randomUUID() }],
    }),
  );
  assert.ok(
    !accepts({ ...workspace, classes: [{ ...classRow, end: "08:50" }] }),
  );
  assert.ok(
    !accepts({
      ...workspace,
      classes: [
        classRow,
        { ...classRow, id: randomUUID(), start: "09:50", end: "10:30" },
      ],
    }),
  );
  assert.ok(
    accepts({
      ...workspace,
      classes: [
        classRow,
        { ...classRow, id: randomUUID(), start: "10:00", end: "11:00" },
      ],
    }),
  );
  const exam = {
    id: randomUUID(),
    course: course.id,
    date: "2026-11-30T13:00:00Z",
    location: "",
    priority: "Normal",
    topics: [],
  };
  const plan = {
    id: randomUUID(),
    exam: exam.id,
    date: "2026-11-23",
    start: "09:30",
    end: "10:30",
    topic: "Vectors",
    done: false,
  };
  assert.ok(
    !accepts({
      ...workspace,
      classes: [classRow],
      exams: [exam],
      plans: [plan],
    }),
  );
  assert.ok(
    !accepts({
      ...workspace,
      exams: [exam],
      plans: [plan, { ...plan, id: randomUUID() }],
    }),
  );
});

test("attendance handles duplicate sessions, targets, and perfect attendance", () => {
  const row = {
    id: randomUUID(),
    course: course.id,
    date: "2026-11-23",
    time: "09:00",
    attended: true,
  };
  assert.ok(
    !accepts({
      ...workspace,
      attendance: [row, { ...row, id: randomUUID(), attended: false }],
    }),
  );
  assert.ok(
    accepts({
      ...workspace,
      attendance: [row, { ...row, id: randomUUID(), time: "10:00" }],
    }),
  );
  assert.deepEqual(attendanceStats(0, 0, 75), {
    percent: null,
    canMiss: 0,
    needed: 0,
  });
  assert.deepEqual(attendanceStats(9, 10, 75), {
    percent: 90,
    canMiss: 2,
    needed: 0,
  });
  assert.deepEqual(attendanceStats(6, 10, 75), {
    percent: 60,
    canMiss: 0,
    needed: 6,
  });
  assert.equal(attendanceStats(9, 10, 100).needed, Infinity);
  assert.equal(attendanceStats(8, 9, 80).canMiss, 1);
});

test("CGPA uses weighted credits and configurable repeat and exclusion policies", () => {
  const first = { id: randomUUID(), name: "Spring" };
  const second = { id: randomUUID(), name: "Fall" };
  const other = {
    ...course,
    id: randomUUID(),
    name: "Calculus",
    code: "MATH101",
  };
  const grades = [
    {
      id: randomUUID(),
      semester: first.id,
      course: course.id,
      credits: 2,
      grade: "A",
      excluded: false,
    },
    {
      id: randomUUID(),
      semester: second.id,
      course: course.id,
      credits: 3,
      grade: "B",
      excluded: false,
    },
    {
      id: randomUUID(),
      semester: second.id,
      course: other.id,
      credits: 3,
      grade: "C",
      excluded: true,
    },
  ];
  const data = {
    ...workspace,
    semesters: [first, second],
    courses: [course, other],
    grades,
    scale: { A: 5, B: 4, C: 2 },
  };
  assert.ok(accepts(data));
  assert.equal(gradeStats(data, first.id).gpa, 5);
  assert.equal(gradeStats(data, second.id).gpa, 4);
  assert.equal(gradeStats(data).gpa, 4.4);
  assert.equal(gradeStats({ ...data, repeats: "Latest semester" }).gpa, 4);
  assert.equal(gradeStats({ ...data, repeats: "Highest grade" }).gpa, 5);
});

test("timezone conversion and countdown preserve the chosen instant", () => {
  const instant = toInstant("2026-11-21T00:05", "Asia/Dhaka");
  assert.equal(instant, "2026-11-20T18:05:00Z");
  assert.equal(localInstant(instant, "Asia/Dhaka"), "2026-11-21T00:05");
  assert.equal(dateAt("Asia/Dhaka", Date.parse(instant)), "2026-11-21");
  assert.equal(minutesLeft(instant, Date.parse("2026-11-20T17:00:01Z")), 65);
  assert.equal(minutesLeft(instant, Date.parse("2026-11-20T19:00:00Z")), 0);
  assert.throws(() => toInstant("2026-11-01T01:30", "America/New_York"));
  assert.throws(() => toInstant("2026-03-08T02:30", "America/New_York"));
});

test("flashcard reviews grow intervals, cap them, and reset on a miss", () => {
  const card = {
    id: randomUUID(),
    front: "Force",
    back: "Mass × acceleration",
    streak: 0,
    due: "2026-11-20",
  };
  assert.deepEqual(reviewCard(card, true, "2026-11-20"), {
    ...card,
    streak: 1,
    due: "2026-11-21",
  });
  assert.equal(
    reviewCard({ ...card, streak: 4 }, true, "2026-11-20").due,
    "2026-12-06",
  );
  assert.equal(
    reviewCard({ ...card, streak: 250 }, true, "2026-11-20").due,
    "2027-01-23",
  );
  assert.deepEqual(reviewCard({ ...card, streak: 3 }, false, "2026-11-20"), {
    ...card,
    due: "2026-11-21",
  });
});

test("APA, MLA, and IEEE format known book references and in-text citations", () => {
  const book = {
    id: "primary",
    type: "book",
    title: "The Practice of Research",
    author: [{ given: "Jane", family: "Doe" }],
    issued: { "date-parts": [[2020]] },
    publisher: "Academic Press",
  };
  const second = {
    ...book,
    id: "second",
    title: "Second Book",
    author: [{ given: "John", family: "Smith" }],
  };
  const apa = formatReferences([book], "apa");
  assert.equal(
    apa.bibliography,
    "Doe, J. (2020). The Practice of Research. Academic Press.",
  );
  assert.equal(apa.inText[0].value, "(Doe, 2020)");
  const mla = formatReferences(
    [book],
    "mla",
    readFileSync(
      new URL("../public/student/csl/mla.csl", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    mla.bibliography,
    "Doe, Jane. The Practice of Research. Academic Press, 2020.",
  );
  assert.equal(mla.inText[0].value, "(Doe)");
  const ieee = formatReferences(
    [book, second],
    "ieee",
    readFileSync(
      new URL("../public/student/csl/ieee.csl", import.meta.url),
      "utf8",
    ),
  );
  assert.match(
    ieee.bibliography,
    /^\[1\] J\. Doe, The Practice of Research\. Academic Press, 2020\./,
  );
  assert.deepEqual(
    ieee.inText.map((row) => row.value),
    ["[1]", "[2]"],
  );
  const incomplete = formatReferences(
    [{ id: "web", type: "webpage", title: "Uncredited text" }],
    "apa",
  );
  assert.equal(incomplete.bibliography, "Uncredited text. (n.d.).");
});
