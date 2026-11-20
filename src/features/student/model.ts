import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

const id = z.uuid();
const name = z.string().trim().min(1).max(150);
const details = z.string().max(4000);
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const instant = z.iso.datetime();
const priority = z.enum(["Low", "Normal", "High"]);
const entries = <T extends z.ZodRawShape>(shape: T, limit = 200) =>
  z
    .array(z.strictObject({ ...shape, id }))
    .max(limit)
    .refine(
      (rows) =>
        new Set(rows.map((row) => (row as { id: string }).id)).size ===
        rows.length,
      "Duplicate record",
    );
const timed = { start: time, end: time };
export const deckList = entries(
  {
    name,
    category: z.string().max(150),
    cards: entries({
      front: name.max(500),
      back: z.string().trim().min(1).max(2000),
      due: date,
      streak: z.number().int().min(0).max(1000),
    }),
  },
  50,
);

export const studentSchema = z
  .strictObject({
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }),
    target: z.number().min(1).max(100),
    studyGoal: z.number().int().min(1).max(1440),
    courses: entries(
      { name, code: name, color: z.string().regex(/^#[a-f0-9]{6}$/i) },
      80,
    ),
    assignments: entries({
      course: id,
      title: name,
      description: details,
      due: instant,
      priority,
      type: name,
      status: z.enum(["To do", "In progress", "Done"]),
      progress: z.number().int().min(0).max(100),
    }),
    classes: entries({
      course: id,
      instructor: z.string().max(150),
      room: z.string().max(150),
      building: z.string().max(150),
      day: z.number().int().min(1).max(7),
      type: name,
      ...timed,
    }),
    attendance: entries(
      { course: id, date, time, attended: z.boolean() },
      3000,
    ),
    semesters: entries({ name }, 50),
    grades: entries(
      {
        course: id,
        semester: id,
        credits: z.number().positive().max(100),
        grade: name,
        excluded: z.boolean(),
      },
      500,
    ),
    scale: z
      .record(name, z.number().min(0).max(100))
      .refine(
        (value) =>
          Object.keys(value).length > 0 && Object.keys(value).length <= 30,
      ),
    passingPoints: z.number().min(0).max(100).default(1),
    repeats: z.enum(["All attempts", "Latest semester", "Highest grade"]),
    decks: deckList,
    study: entries(
      {
        course: id.nullable(),
        ended: instant,
        minutes: z.number().int().min(1).max(180),
      },
      1000,
    ),
    exams: entries({
      course: id,
      date: instant,
      location: z.string().max(150),
      priority,
      topics: entries({ name, done: z.boolean() }, 100),
    }),
    plans: entries({
      exam: id,
      date,
      ...timed,
      topic: name,
      done: z.boolean(),
    }),
    notes: entries(
      { title: name, content: z.string().min(1).max(12000), created: instant },
      100,
    ),
  })
  .superRefine((data, context) => {
    const reject = (message: string) =>
      context.addIssue({ code: "custom", message });
    const courses = new Set(data.courses.map((course) => course.id));
    if (
      new Set(data.courses.map((course) => course.code.toLowerCase())).size !==
      courses.size
    )
      reject("Course codes must be unique.");
    if (
      [
        ...data.assignments,
        ...data.classes,
        ...data.attendance,
        ...data.grades,
        ...data.exams,
        ...data.study,
      ].some((row) => row.course && !courses.has(row.course))
    )
      reject("Select an existing course.");
    if (
      data.grades.some(
        (row) =>
          !Object.hasOwn(data.scale, row.grade) ||
          !data.semesters.some((semester) => semester.id === row.semester),
      )
    )
      reject("Each grade needs an existing semester and grade label.");
    const sessions = data.attendance.map((row) =>
      [row.course, row.date, row.time].join("/"),
    );
    if (new Set(sessions).size !== sessions.length)
      reject("This attendance session is already recorded.");
    if (
      data.plans.some((row) => !data.exams.some((exam) => exam.id === row.exam))
    )
      reject("Select an existing exam.");
    if (
      data.plans.some((plan) => {
        const day = Temporal.PlainDate.from(plan.date).dayOfWeek;
        return data.classes.some(
          (row) =>
            row.day === day && plan.start < row.end && row.start < plan.end,
        );
      })
    )
      reject("A study block overlaps a scheduled class.");
    for (const rows of [data.classes, data.plans]) {
      const sorted = rows
        .map((row) => ({
          ...row,
          period: "day" in row ? String(row.day) : row.date,
        }))
        .sort(
          (a, b) =>
            a.period.localeCompare(b.period) || a.start.localeCompare(b.start),
        );
      if (
        sorted.some(
          (row, index) =>
            row.start >= row.end ||
            (index > 0 &&
              sorted[index - 1].period === row.period &&
              sorted[index - 1].end > row.start),
        )
      ) {
        reject(
          "Check for overlapping times and make sure each end time follows its start.",
        );
      }
    }
  });

export type Student = z.infer<typeof studentSchema>;
export const emptyStudent: Student = {
  timezone: "UTC",
  target: 75,
  studyGoal: 60,
  courses: [],
  assignments: [],
  classes: [],
  attendance: [],
  semesters: [],
  grades: [],
  scale: { A: 4, "A-": 3.7, "B+": 3.3, B: 3, C: 2, D: 1, F: 0 },
  passingPoints: 1,
  repeats: "All attempts",
  decks: [],
  study: [],
  exams: [],
  plans: [],
  notes: [],
};
export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const dayAt = (zone: string, timestamp = Date.now()) =>
  Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(zone);
export const dateAt = (zone: string, timestamp = Date.now()) =>
  dayAt(zone, timestamp).toPlainDate().toString();
export function toInstant(value: string, zone: string) {
  try {
    return Temporal.PlainDateTime.from(value)
      .toZonedDateTime(zone, { disambiguation: "reject" })
      .toInstant()
      .toString();
  } catch {
    throw new Error(
      `That local time is ambiguous or unavailable in ${zone}. Choose another time.`,
    );
  }
}
export const localInstant = (value: string, zone: string) =>
  Temporal.Instant.from(value)
    .toZonedDateTimeISO(zone)
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
export const minutesLeft = (instant: string, now: number) =>
  Math.max(0, Math.ceil((Date.parse(instant) - now) / 60000));

export function attendanceStats(
  attended: number,
  total: number,
  percent: number,
) {
  const needed =
    100 * attended >= percent * total
      ? 0
      : percent === 100
        ? Infinity
        : Math.ceil(
            (percent * total - 100 * attended) / (100 - percent) - 1e-9,
          );
  return {
    percent: total ? (attended / total) * 100 : null,
    canMiss: Math.max(0, Math.floor((100 * attended) / percent - total + 1e-9)),
    needed,
  };
}

export function gradeStats(data: Student, semester?: string) {
  let rows = data.grades.filter(
    (row) => !row.excluded && (!semester || row.semester === semester),
  );
  if (!semester && data.repeats !== "All attempts") {
    const selected = new Map<string, Student["grades"][number]>();
    for (const row of rows) {
      const old = selected.get(row.course);
      const newer =
        data.semesters.findIndex((s) => s.id === row.semester) >=
        data.semesters.findIndex((s) => s.id === old?.semester);
      if (
        !old ||
        (data.repeats === "Latest semester"
          ? newer
          : data.scale[row.grade] >= data.scale[old.grade])
      )
        selected.set(row.course, row);
    }
    rows = [...selected.values()];
  }
  const credits = rows.reduce((sum, row) => sum + row.credits, 0);
  const points = rows.reduce(
    (sum, row) => sum + data.scale[row.grade] * row.credits,
    0,
  );
  const completedCredits = rows.reduce(
    (sum, row) =>
      sum +
      (data.scale[row.grade] >= (data.passingPoints ?? 1) ? row.credits : 0),
    0,
  );
  return {
    credits,
    completedCredits,
    points,
    gpa: credits ? points / credits : null,
  };
}

export function reviewCard(
  card: Student["decks"][number]["cards"][number],
  known: boolean,
  today: string,
) {
  const streak = known ? Math.min(1000, card.streak + 1) : 0;
  return {
    ...card,
    streak,
    due: Temporal.PlainDate.from(today)
      .add({ days: known ? 2 ** Math.min(streak - 1, 6) : 1 })
      .toString(),
  };
}
