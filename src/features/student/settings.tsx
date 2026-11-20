"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EditActions,
  Field,
  Form,
  Panel,
  Row,
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
    </div>
  );
}
