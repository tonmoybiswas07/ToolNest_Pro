import "server-only";
import { MongoServerError, type ClientSession } from "mongodb";
import { applicationMongo } from "@/lib/mongodb";
import { emptyStudent, type Student } from "./model";

const domains = {
  student_courses: ["courses"],
  student_assignments: ["assignments"],
  student_class_schedules: ["classes"],
  student_attendance: ["attendance"],
  student_grades: ["semesters", "grades", "scale", "passingPoints", "repeats"],
  student_flashcards: ["decks"],
  student_study_sessions: ["study"],
  student_exam_plans: ["exams", "plans"],
  student_notes: ["notes"],
} as const satisfies Record<string, readonly (keyof Student)[]>;

const domainEntries = Object.entries(domains);
type Profile = {
  _id: string;
  revision: number;
  updatedAt: Date;
  preferences: Pick<Student, "timezone" | "target" | "studyGoal">;
};
type Section = { _id: string; records: Partial<Student> };
type JoinedProfile = Profile & Partial<Record<keyof typeof domains, Section[]>>;

export async function readWorkspace(owner: string, session?: ClientSession) {
  const { db } = applicationMongo();
  const profile = await db
    .collection<Profile>("student_profiles")
    .aggregate<JoinedProfile>(
      [
        { $match: { _id: owner } },
        ...domainEntries.map(([name]) => ({
          $lookup: {
            from: name,
            localField: "_id",
            foreignField: "_id",
            as: name,
          },
        })),
      ],
      session ? { session } : { readConcern: { level: "snapshot" } },
    )
    .next();
  const data = { ...emptyStudent, ...profile?.preferences };
  for (const name of Object.keys(domains) as (keyof typeof domains)[]) {
    Object.assign(data, profile?.[name]?.[0]?.records);
  }
  return {
    data,
    revision: profile?.revision ?? 0,
    updatedAt: profile?.updatedAt,
  };
}

export async function writeWorkspace(
  owner: string,
  revision: number,
  data: Student,
) {
  const { client, db } = applicationMongo();
  try {
    return await client.withSession((session) =>
      session.withTransaction(
        async () => {
          const previous = await readWorkspace(owner, session);
          if (previous.revision !== revision) return 409;
          const updatedAt = new Date();
          if (
            previous.updatedAt &&
            updatedAt.getTime() - previous.updatedAt.getTime() < 400
          )
            return 429;
          const { timezone, target, studyGoal } = data;
          await db
            .collection<Profile>("student_profiles")
            .updateOne(
              { _id: owner, revision },
              {
                $inc: { revision: 1 },
                $set: {
                  updatedAt,
                  preferences: { timezone, target, studyGoal },
                },
              },
              { session, upsert: revision === 0 },
            );
          for (const [name, keys] of domainEntries) {
            const records = Object.fromEntries(
              keys.map((key) => [key, data[key]]),
            );
            if (
              keys.every(
                (key) =>
                  JSON.stringify(previous.data[key]) ===
                  JSON.stringify(data[key]),
              )
            )
              continue;
            await db
              .collection<Section>(name)
              .updateOne(
                { _id: owner },
                { $set: { records } },
                { upsert: true, session },
              );
          }
          return 200;
        },
        { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
      ),
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return 409;
    throw error;
  }
}
