"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  EditActions,
  Field,
  Form,
  Panel,
  Row,
  download,
  get,
  newId,
  replace,
  useStudent,
  without,
} from "./workspace";

export function StudentSettings() {
  const { data, save } = useStudent();
  const [editing, setEditing] = useState("");
  const course = data.courses.find((item) => item.id === editing);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title="Academic preferences">
        <Form
          onSave={(form) =>
            save({
              ...data,
              timezone: get(form, "zone"),
              target: Number(get(form, "target")),
              studyGoal: Number(get(form, "goal")),
            })
          }
        >
          <Field
            label="Time zone (IANA name)"
            name="zone"
            value={data.timezone}
          />
          <Field
            label="Minimum attendance (%)"
            name="target"
            type="number"
            value={data.target}
            min={1}
            max={100}
            step="any"
          />
          <Field
            label="Daily focus goal (minutes)"
            name="goal"
            type="number"
            value={data.studyGoal}
            min={1}
            max={1440}
          />
        </Form>
        <p className="mt-4 text-sm text-muted-foreground">
          Use a time zone such as Asia/Dhaka or America/New_York. Stored
          deadlines keep their original instant when the zone changes.
        </p>
      </Panel>
      <Panel title="Courses">
        <Form
          key={editing}
          reset
          onSave={async (form) => {
            const ok = await save({
              ...data,
              courses: replace(data.courses, {
                id: course?.id ?? newId(),
                name: get(form, "name"),
                code: get(form, "code"),
                color: get(form, "color"),
              }),
            });
            if (ok) setEditing("");
            return ok;
          }}
          label={course ? "Update course" : "Add course"}
        >
          <Field label="Course name" name="name" value={course?.name} />
          <Field label="Course code" name="code" value={course?.code} />
          <Field
            label="Course color"
            name="color"
            type="color"
            value={course?.color ?? "#6366f1"}
          />
          {course && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing("")}
            >
              Cancel edit
            </Button>
          )}
        </Form>
        <ul className="mt-4">
          {data.courses.map((item) => (
            <Row
              key={item.id}
              title={item.name}
              actions={
                <EditActions
                  title={item.name}
                  edit={() => setEditing(item.id)}
                  remove={() =>
                    void save({
                      ...data,
                      courses: without(data.courses, item.id),
                    })
                  }
                />
              }
            >
              <span
                className="mr-2 inline-block size-2 rounded-full"
                style={{ background: item.color }}
              />
              {item.code}
            </Row>
          ))}
        </ul>
        {!data.courses.length && (
          <p className="mt-4 text-sm text-muted-foreground">
            Courses are shared by your routine, attendance, grades, and study
            plans.
          </p>
        )}
      </Panel>
      <Panel title="Workspace Backup & Restore" className="lg:col-span-2">
        <p className="mb-4 text-sm text-muted-foreground">
          Export your entire student hub workspace (courses, timetables, assignments, attendance, grades, flashcards, exams, and notes) to a JSON file, or restore from a previous backup.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const filename = `toolnest-student-backup-${new Date().toISOString().slice(0, 10)}.json`;
              download(filename, JSON.stringify(data, null, 2), "application/json");
              toast.success("Workspace backup downloaded.");
            }}
          >
            Export Full Backup (.json)
          </Button>
          <label className="text-sm">
            <span className="block text-xs font-medium text-muted-foreground mb-1">Restore from backup</span>
            <input
              type="file"
              accept=".json,application/json"
              className="student-input"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (!file) return;
                try {
                  const content = await file.text();
                  const parsed = JSON.parse(content);
                  if (typeof parsed !== "object" || !parsed) throw new Error();
                  const ok = await save({
                    ...data,
                    courses: Array.isArray(parsed.courses) ? parsed.courses : data.courses,
                    classes: Array.isArray(parsed.classes) ? parsed.classes : data.classes,
                    assignments: Array.isArray(parsed.assignments) ? parsed.assignments : data.assignments,
                    attendance: Array.isArray(parsed.attendance) ? parsed.attendance : data.attendance,
                    decks: Array.isArray(parsed.decks) ? parsed.decks : data.decks,
                    exams: Array.isArray(parsed.exams) ? parsed.exams : data.exams,
                    notes: Array.isArray(parsed.notes) ? parsed.notes : data.notes,
                    semesters: Array.isArray(parsed.semesters) ? parsed.semesters : data.semesters,
                    grades: Array.isArray(parsed.grades) ? parsed.grades : data.grades,
                    timezone: typeof parsed.timezone === "string" ? parsed.timezone : data.timezone,
                    target: typeof parsed.target === "number" ? parsed.target : data.target,
                    studyGoal: typeof parsed.studyGoal === "number" ? parsed.studyGoal : data.studyGoal,
                  });
                  if (ok) {
                    toast.success("Workspace successfully restored from backup!");
                  } else {
                    toast.error("Could not save restored workspace.");
                  }
                } catch {
                  toast.error("Invalid workspace backup file.");
                }
              }}
            />
          </label>
        </div>
      </Panel>
    </div>
  );
}
