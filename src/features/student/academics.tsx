"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  attendanceStats,
  dateAt,
  dayAt,
  days,
  gradeStats,
  localInstant,
  toInstant,
  type Student,
} from "./model";
import {
  CoursePrompt,
  EditActions,
  Field,
  Form,
  Panel,
  Row,
  choices,
  courseName,
  courseOptions,
  get,
  newId,
  priority,
  readable,
  replace,
  useStudent,
  without,
} from "./workspace";

const statuses = ["To do", "In progress", "Done"] as const;

export function Assignments() {
  const { data, save, pending } = useStudent();
  const [editing, setEditing] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [calendar, setCalendar] = useState(false);
  const [month, setMonth] = useState(() => dateAt(data.timezone).slice(0, 7));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const entry = data.assignments.find((item) => item.id === editing);
  const rows = data.assignments
    .filter((item) => {
      const overdue = item.status !== "Done" && Date.parse(item.due) < now;
      return (
        (filter === "All" ||
          filter === item.status ||
          (filter === "Overdue" && overdue)) &&
        `${item.title} ${courseName(data, item.course)} ${item.description}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort((a, b) => a.due.localeCompare(b.due));
  const [year, number] = month.split("-").map(Number);
  const start = month
    ? (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7
    : 0;
  const total = month ? new Date(Date.UTC(year, number, 0)).getUTCDate() : 0;
  const filtered = rows.filter((row) =>
    localInstant(row.due, data.timezone).startsWith(month),
  );
  return (
    <div className="grid gap-5">
      <Panel title={entry ? "Edit assignment" : "New assignment"}>
        {!data.courses.length ? (
          <CoursePrompt />
        ) : (
          <Form
            key={editing}
            reset
            label={entry ? "Update assignment" : "Add assignment"}
            onSave={async (form) => {
              const status = get(
                form,
                "status",
              ) as Student["assignments"][number]["status"];
              const progress = Number(get(form, "progress"));
              const ok = await save({
                ...data,
                assignments: replace(data.assignments, {
                  id: entry?.id ?? newId(),
                  title: get(form, "title"),
                  course: get(form, "course"),
                  description: get(form, "description"),
                  due: toInstant(get(form, "due"), data.timezone),
                  priority: get(form, "priority") as "Normal",
                  type: get(form, "type"),
                  status: progress === 100 ? "Done" : status,
                  progress: status === "Done" ? 100 : progress,
                }),
              });
              if (ok) setEditing("");
              return ok;
            }}
          >
            <Field label="Assignment title" name="title" value={entry?.title} />
            <Field
              label="Course"
              name="course"
              options={courseOptions(data)}
              value={entry?.course}
            />
            <Field
              label={`Deadline (${data.timezone})`}
              type="datetime-local"
              name="due"
              value={entry && localInstant(entry.due, data.timezone)}
            />
            <Field
              label="Assignment type"
              name="type"
              value={entry?.type ?? "Homework"}
            />
            <Field
              label="Priority"
              name="priority"
              options={priority}
              value={entry?.priority ?? "Normal"}
            />
            <Field
              label="Status"
              name="status"
              options={choices(statuses)}
              value={entry?.status ?? "To do"}
            />
            <Field
              label="Progress (%)"
              name="progress"
              type="number"
              min={0}
              max={100}
              value={entry?.progress ?? 0}
            />
            <Field
              label="Description"
              name="description"
              multiline
              optional
              value={entry?.description}
            />
            {entry && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing("")}
              >
                Cancel edit
              </Button>
            )}
          </Form>
        )}
      </Panel>
      <Panel title="Deadlines">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Search assignments
            <input
              className="student-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Filter by status
            <select
              className="student-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {["All", "Overdue", ...statuses].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            className="self-end"
            onClick={() => setCalendar(!calendar)}
          >
            {calendar ? "List view" : "Calendar view"}
          </Button>
        </div>
        {calendar && (
          <div className="mb-5">
            <label className="text-sm">
              Calendar month
              <input
                className="student-input mt-1 max-w-52"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </label>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {days.map((day) => (
                <span
                  key={day}
                  className="text-center text-xs text-muted-foreground"
                >
                  {day.slice(0, 3)}
                </span>
              ))}
              {Array.from({ length: start }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: total }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                const count = filtered.filter((row) =>
                  localInstant(row.due, data.timezone).startsWith(date),
                ).length;
                return (
                  <div
                    key={date}
                    className="rounded-md border border-border p-1 text-center text-xs sm:p-2"
                    aria-label={`${date}, ${count} deadlines`}
                  >
                    {i + 1}
                    {count > 0 && (
                      <span className="block font-semibold text-highlight">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <ul>
          {(calendar ? filtered : rows).map((item) => (
            <Row
              key={item.id}
              title={item.title}
              actions={
                <>
                  {item.status !== "Done" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        void save({
                          ...data,
                          assignments: replace(data.assignments, {
                            ...item,
                            status: "Done",
                            progress: 100,
                          }),
                        })
                      }
                    >
                      Complete
                    </Button>
                  )}
                  <EditActions
                    title={item.title}
                    edit={() => setEditing(item.id)}
                    remove={() =>
                      void save({
                        ...data,
                        assignments: without(data.assignments, item.id),
                      })
                    }
                  />
                </>
              }
            >
              {courseName(data, item.course)} ·{" "}
              {readable(item.due, data.timezone)} · {item.priority} ·{" "}
              {item.status} · {item.progress}%
              {item.status !== "Done" && Date.parse(item.due) < now && (
                <strong className="ml-2 text-destructive">Overdue</strong>
              )}
              {item.description && (
                <p className="mt-1 whitespace-pre-wrap">{item.description}</p>
              )}
            </Row>
          ))}
        </ul>
        {!(calendar ? filtered : rows).length && (
          <p className="text-sm text-muted-foreground">
            No matching deadlines.
          </p>
        )}
      </Panel>
    </div>
  );
}

export function Routine() {
  const { data, save } = useStudent();
  const [editing, setEditing] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const entry = data.classes.find((item) => item.id === editing);
  const today = dayAt(data.timezone).dayOfWeek;
  return (
    <div className="grid gap-5">
      <Panel title={entry ? "Edit class" : "Schedule a class"}>
        {!data.courses.length ? (
          <CoursePrompt />
        ) : (
          <Form
            key={editing}
            reset
            label={entry ? "Update class" : "Add class"}
            onSave={async (form) => {
              const ok = await save({
                ...data,
                classes: replace(data.classes, {
                  id: entry?.id ?? newId(),
                  course: get(form, "course"),
                  day: Number(get(form, "day")),
                  start: get(form, "start"),
                  end: get(form, "end"),
                  instructor: get(form, "instructor"),
                  building: get(form, "building"),
                  room: get(form, "room"),
                  type: get(form, "type"),
                }),
              });
              if (ok) setEditing("");
              return ok;
            }}
          >
            <Field
              label="Course"
              name="course"
              options={courseOptions(data)}
              value={entry?.course}
            />
            <Field
              label="Class day"
              name="day"
              options={days.map((day, i) => [i + 1, day])}
              value={entry?.day ?? today}
            />
            <Field
              label="Start time"
              name="start"
              type="time"
              value={entry?.start}
            />
            <Field label="End time" name="end" type="time" value={entry?.end} />
            <Field
              label="Instructor"
              name="instructor"
              optional
              value={entry?.instructor}
            />
            <Field
              label="Room number"
              name="room"
              optional
              value={entry?.room}
            />
            <Field
              label="Building"
              name="building"
              optional
              value={entry?.building}
            />
            <Field
              label="Class type"
              name="type"
              value={entry?.type ?? "Lecture"}
            />
            {entry && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing("")}
              >
                Cancel edit
              </Button>
            )}
          </Form>
        )}
      </Panel>
      <Panel title="Weekly timetable" className="student-print">
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button
            variant="outline"
            aria-pressed={todayOnly}
            onClick={() => setTodayOnly(!todayOnly)}
          >
            {todayOnly ? "Show full week" : "Show today"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {days.map((day, i) => {
            const rows = data.classes
              .filter((item) => item.day === i + 1)
              .sort((a, b) => a.start.localeCompare(b.start));
            return (
              <section
                key={day}
                className={`rounded-lg border border-border p-3 ${todayOnly && today !== i + 1 ? "hidden print:block" : ""}`}
              >
                <h3 className="font-semibold">
                  {day}
                  {today === i + 1 && (
                    <span className="ml-2 text-xs text-highlight">Today</span>
                  )}
                </h3>
                {!rows.length && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No classes
                  </p>
                )}
                <ul>
                  {rows.map((item) => (
                    <li
                      className="mt-3 rounded-md border-l-4 bg-accent p-2 text-sm print:text-black"
                      key={item.id}
                      style={{
                        borderLeftColor: data.courses.find(
                          (course) => course.id === item.course,
                        )?.color,
                      }}
                    >
                      <p className="font-semibold">
                        {courseName(data, item.course)}
                      </p>
                      <p>
                        {item.start}–{item.end} · {item.type}
                      </p>
                      <p>
                        {[item.instructor, item.building, item.room]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-1 flex flex-wrap print:hidden">
                        <EditActions
                          title={courseName(data, item.course)}
                          edit={() => setEditing(item.id)}
                          remove={() =>
                            void save({
                              ...data,
                              classes: without(data.classes, item.id),
                            })
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function Attendance() {
  const { data, pending, save } = useStudent();
  const [editing, setEditing] = useState("");
  const entry = data.attendance.find((item) => item.id === editing);
  const today = dayAt(data.timezone);
  return (
    <div className="grid gap-5">
      <Panel title="Course attendance">
        <Form
          onSave={(form) =>
            save({ ...data, target: Number(get(form, "target")) })
          }
          label="Update target"
        >
          <Field
            label="Minimum attendance (%)"
            name="target"
            type="number"
            min={1}
            max={100}
            value={data.target}
            step="any"
          />
        </Form>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.courses.map((course) => {
            const rows = data.attendance.filter(
              (row) => row.course === course.id,
            );
            const attended = rows.filter((row) => row.attended).length;
            const result = attendanceStats(attended, rows.length, data.target);
            return (
              <section
                className="rounded-lg border border-border p-4"
                key={course.id}
              >
                <h3 className="font-semibold">{course.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {attended} attended · {rows.length - attended} missed ·{" "}
                  {rows.length} total
                </p>
                <progress
                  className="my-2 w-full accent-primary"
                  max={100}
                  value={result.percent ?? 0}
                  aria-label={`${course.name} attendance`}
                />
                <p className="text-sm">
                  {result.percent === null
                    ? "No sessions recorded"
                    : `${result.percent.toFixed(1)}% · Can miss ${result.canMiss} · ${Number.isFinite(result.needed) ? `${result.needed} more attended to reach target` : "100% is no longer reachable"}`}
                </p>
              </section>
            );
          })}
        </div>
      </Panel>
      <Panel title={entry ? "Edit session" : "Record attendance"}>
        {!data.courses.length ? (
          <CoursePrompt />
        ) : (
          <Form
            key={editing}
            reset
            label={entry ? "Update session" : "Record session"}
            onSave={async (form) => {
              const ok = await save({
                ...data,
                attendance: replace(data.attendance, {
                  id: entry?.id ?? newId(),
                  course: get(form, "course"),
                  date: get(form, "date"),
                  time: get(form, "time"),
                  attended: get(form, "mark") === "Attended",
                }),
              });
              if (ok) setEditing("");
              return ok;
            }}
          >
            <Field
              label="Course"
              name="course"
              options={courseOptions(data)}
              value={entry?.course}
            />
            <Field
              label="Date"
              name="date"
              type="date"
              value={entry?.date ?? today.toPlainDate().toString()}
            />
            <Field
              label="Session time"
              name="time"
              type="time"
              value={entry?.time}
            />
            <Field
              label="Attendance"
              name="mark"
              options={choices(["Attended", "Missed"])}
              value={entry?.attended === false ? "Missed" : "Attended"}
            />
            {entry && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing("")}
              >
                Cancel edit
              </Button>
            )}
          </Form>
        )}
        {data.classes
          .filter((item) => item.day === today.dayOfWeek)
          .map((item) => {
            const date = today.toPlainDate().toString();
            const exists = data.attendance.some(
              (row) =>
                row.course === item.course &&
                row.date === date &&
                row.time === item.start,
            );
            return (
              <div
                key={item.id}
                className="mt-3 flex flex-wrap items-center gap-2 text-sm"
              >
                <span>
                  {item.start} · {courseName(data, item.course)}
                </span>
                {exists ? (
                  <span>Recorded</span>
                ) : (
                  [true, false].map((attended) => (
                    <Button
                      key={String(attended)}
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        void save({
                          ...data,
                          attendance: [
                            ...data.attendance,
                            {
                              id: newId(),
                              course: item.course,
                              date,
                              time: item.start,
                              attended,
                            },
                          ],
                        })
                      }
                    >
                      {attended ? "Mark attended" : "Mark missed"}
                    </Button>
                  ))
                )}
              </div>
            );
          })}
      </Panel>
      <Panel title="Attendance history">
        {!data.attendance.length && (
          <p className="text-sm text-muted-foreground">No sessions recorded.</p>
        )}
        <ul>
          {[...data.attendance]
            .sort((a, b) =>
              `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
            )
            .map((item) => (
              <Row
                key={item.id}
                title={courseName(data, item.course)}
                actions={
                  <EditActions
                    title={courseName(data, item.course)}
                    edit={() => setEditing(item.id)}
                    remove={() =>
                      void save({
                        ...data,
                        attendance: without(data.attendance, item.id),
                      })
                    }
                  />
                }
              >
                {item.date} · {item.time} ·{" "}
                {item.attended ? "Attended" : "Missed"}
              </Row>
            ))}
        </ul>
      </Panel>
    </div>
  );
}

export function Grades() {
  const { data, save } = useStudent();
  const [editing, setEditing] = useState("");
  const [semesterEdit, setSemesterEdit] = useState("");
  const [scenario, setScenario] = useState<{
    target: number;
    credits: number;
    projected: number;
  }>();
  const entry = data.grades.find((item) => item.id === editing);
  const semester = data.semesters.find((item) => item.id === semesterEdit);
  const total = gradeStats(data);
  const ceiling = Math.max(...Object.values(data.scale));
  const needed = scenario
    ? (scenario.target * (total.credits + scenario.credits) - total.points) /
      scenario.credits
    : 0;
  return (
    <div className="grid gap-5">
      <Panel title="Grade overview" className="student-print">
        <p className="text-3xl font-semibold">
          {total.gpa?.toFixed(2) ?? "—"}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            Cumulative GPA · {total.credits} counted credits ·{" "}
            {total.completedCredits} completed credits
          </span>
        </p>
        <Button
          className="mt-2 print:hidden"
          variant="outline"
          onClick={() => window.print()}
        >
          Print / Save PDF
        </Button>
        <ul className="mt-3">
          {data.semesters.map((item) => {
            const stats = gradeStats(data, item.id);
            return (
              <Row
                key={item.id}
                title={item.name}
                actions={
                  <span className="print:hidden">
                    <EditActions
                      title={item.name}
                      edit={() => setSemesterEdit(item.id)}
                      remove={() =>
                        void save({
                          ...data,
                          semesters: without(data.semesters, item.id),
                          grades: data.grades.filter(
                            (row) => row.semester !== item.id,
                          ),
                        })
                      }
                    />
                  </span>
                }
              >
                <p>
                  Semester GPA {stats.gpa?.toFixed(2) ?? "—"} · {stats.credits}{" "}
                  counted credits
                </p>
                <ul>
                  {data.grades
                    .filter((row) => row.semester === item.id)
                    .map((row) => (
                      <li
                        key={row.id}
                        className="mt-1 flex flex-wrap items-center gap-2"
                      >
                        {courseName(data, row.course)} · {row.credits} credits ·{" "}
                        {row.grade} ({data.scale[row.grade]}){" "}
                        {row.excluded && "· excluded"}
                        <span className="print:hidden">
                          <EditActions
                            title={courseName(data, row.course)}
                            edit={() => setEditing(row.id)}
                            remove={() =>
                              void save({
                                ...data,
                                grades: without(data.grades, row.id),
                              })
                            }
                          />
                        </span>
                      </li>
                    ))}
                </ul>
              </Row>
            );
          })}
        </ul>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={semester ? "Rename semester" : "Add semester"}>
          <Form
            key={semesterEdit}
            reset
            onSave={async (form) => {
              const ok = await save({
                ...data,
                semesters: replace(data.semesters, {
                  id: semester?.id ?? newId(),
                  name: get(form, "semester"),
                }),
              });
              if (ok) setSemesterEdit("");
              return ok;
            }}
          >
            <Field
              label="Semester name"
              name="semester"
              value={semester?.name}
            />
            {semester && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => setSemesterEdit("")}
              >
                Cancel edit
              </Button>
            )}
          </Form>
          <p className="mt-3 text-sm text-muted-foreground">
            Add semesters in chronological order for the latest semester policy.
          </p>
        </Panel>
        <Panel title={entry ? "Edit course grade" : "Add course grade"}>
          {!data.courses.length ? (
            <CoursePrompt />
          ) : !data.semesters.length ? (
            <p className="text-sm text-muted-foreground">
              Add a semester first.
            </p>
          ) : (
            <Form
              key={editing}
              reset
              onSave={async (form) => {
                const ok = await save({
                  ...data,
                  grades: replace(data.grades, {
                    id: entry?.id ?? newId(),
                    course: get(form, "course"),
                    semester: get(form, "semester"),
                    credits: Number(get(form, "credits")),
                    grade: get(form, "grade"),
                    excluded: get(form, "included") === "Exclude",
                  }),
                });
                if (ok) setEditing("");
                return ok;
              }}
            >
              <Field
                label="Course"
                name="course"
                options={courseOptions(data)}
                value={entry?.course}
              />
              <Field
                label="Semester"
                name="semester"
                options={data.semesters.map((item) => [item.id, item.name])}
                value={entry?.semester}
              />
              <Field
                label="Credits"
                name="credits"
                type="number"
                min={0.01}
                max={100}
                step="any"
                value={entry?.credits ?? 3}
              />
              <Field
                label="Letter grade"
                name="grade"
                options={choices(Object.keys(data.scale))}
                value={entry?.grade}
              />
              <Field
                label="GPA calculation"
                name="included"
                options={choices(["Include", "Exclude"])}
                value={entry?.excluded ? "Exclude" : "Include"}
              />
              {entry && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setEditing("")}
                >
                  Cancel edit
                </Button>
              )}
            </Form>
          )}
        </Panel>
        <Panel title="Grading policy">
          <Form
            onSave={(form) => {
              const rows = get(form, "scale")
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => {
                  const match = /^([^=]+)=\s*(\d+(?:\.\d+)?)\s*$/.exec(line);
                  if (!match)
                    throw new Error("Enter each grade as label=points.");
                  return [match[1].trim(), Number(match[2])] as const;
                });
              if (new Set(rows.map(([label]) => label)).size !== rows.length)
                throw new Error("Grade labels must be unique.");
              return save({
                ...data,
                scale: Object.fromEntries(rows),
                passingPoints: Number(get(form, "passing")),
                repeats: get(form, "repeats") as Student["repeats"],
              });
            }}
          >
            <Field
              label="Scale (one grade=points per line)"
              name="scale"
              multiline
              value={Object.entries(data.scale)
                .map(([key, value]) => `${key}=${value}`)
                .join("\n")}
            />
            <Field
              label="Minimum grade points to earn credit"
              name="passing"
              type="number"
              min={0}
              max={100}
              step="any"
              value={data.passingPoints ?? 1}
            />
            <Field
              label="Repeated courses in CGPA"
              name="repeats"
              options={choices([
                "All attempts",
                "Latest semester",
                "Highest grade",
              ])}
              value={data.repeats}
            />
          </Form>
        </Panel>
        <Panel title="Target CGPA and what-if scenario">
          <Form
            label="Calculate scenario"
            onSave={async (form) => {
              setScenario({
                target: Number(get(form, "target")),
                credits: Number(get(form, "credits")),
                projected: Number(get(form, "projected")),
              });
              return true;
            }}
          >
            <Field
              label="Target CGPA"
              name="target"
              type="number"
              min={0}
              max={ceiling}
              step="any"
            />
            <Field
              label="Additional counted credits"
              name="credits"
              type="number"
              min={0.01}
              step="any"
            />
            <Field
              label="Expected average grade points"
              name="projected"
              type="number"
              min={0}
              max={ceiling}
              step="any"
            />
          </Form>
          {scenario && (
            <p role="status" className="mt-3 text-sm">
              Projected CGPA{" "}
              {(
                (total.points + scenario.credits * scenario.projected) /
                (total.credits + scenario.credits)
              ).toFixed(2)}
              .{" "}
              {needed > ceiling
                ? "The target exceeds this scale with these credits."
                : `Required average ${Math.max(0, needed).toFixed(2)}.`}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
