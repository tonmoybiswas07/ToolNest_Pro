"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  dateAt,
  deckList,
  localInstant,
  minutesLeft,
  reviewCard,
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
  courseName,
  courseOptions,
  download,
  get,
  newId,
  operation,
  priority,
  readable,
  replace,
  useStudent,
  without,
} from "./workspace";

const phases = ["Focus", "Short break", "Long break"] as const;
type Phase = (typeof phases)[number];

export function Pomodoro() {
  const { data, save, pending } = useStudent();
  const [phase, setPhase] = useState<Phase>("Focus");
  const [duration, setDuration] = useState({
    Focus: 25,
    "Short break": 5,
    "Long break": 15,
  });
  const [remaining, setRemaining] = useState(25 * 60000);
  const [deadline, setDeadline] = useState(0);
  const [course, setCourse] = useState("");
  const [sound, setSound] = useState(false);
  const [notify, setNotify] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<Student["study"][number]>();
  const audio = useRef<AudioContext | null>(null);
  const finished = useRef(0);

  const recordCompleted = useEffectEvent(
    async (entry: Student["study"][number]) => {
      if (!(await save({ ...data, study: replace(data.study, entry) })))
        setHistoryEntry(entry);
    },
  );

  useEffect(() => {
    if (!deadline) return;
    function tick() {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left || finished.current === deadline) return;
      finished.current = deadline;
      setDeadline(0);
      if (phase === "Focus") {
        void recordCompleted({
          id: newId(),
          course: course || null,
          ended: new Date(deadline).toISOString(),
          minutes: duration.Focus,
        });
      } else operation("pomodoro-timer", true);
      if (sound && audio.current?.state === "running") {
        const osc = audio.current.createOscillator();
        osc.connect(audio.current.destination);
        osc.start();
        osc.stop(audio.current.currentTime + 0.2);
      }
      if (notify && window.Notification?.permission === "granted") {
        try {
          new Notification(`${phase} complete`);
        } catch {
          toast.info(`${phase} complete`);
        }
      } else toast.info(`${phase} complete`);
    }
    const timer = window.setInterval(tick, 200);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, course, phase, duration.Focus, sound, notify]);

  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
    },
    [],
  );

  async function record() {
    if (!historyEntry) return;
    if (await save({ ...data, study: replace(data.study, historyEntry) }))
      setHistoryEntry(undefined);
  }

  const seconds = Math.ceil(remaining / 1000);
  const today = dateAt(data.timezone);
  const sessions = data.study.filter(
    (row) => dateAt(data.timezone, Date.parse(row.ended)) === today,
  );
  const minutes = sessions.reduce((sum, row) => sum + row.minutes, 0);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Study timer">
        <div className="flex flex-wrap gap-2">
          {phases.map((item) => (
            <Button
              key={item}
              disabled={!!deadline}
              aria-pressed={item === phase}
              variant={item === phase ? "default" : "outline"}
              onClick={() => {
                setPhase(item);
                setRemaining(duration[item] * 60000);
              }}
            >
              {item}
            </Button>
          ))}
        </div>
        <p
          className="py-8 text-center text-6xl font-semibold tracking-tight tabular-nums"
          role="timer"
          aria-label={`${phase} time remaining`}
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
        <label className="text-sm font-medium">
          Subject
          <select
            className="student-input mb-4"
            disabled={!!deadline || remaining !== duration[phase] * 60000}
            value={course}
            onChange={(event) => setCourse(event.target.value)}
          >
            <option value="">General study</option>
            {courseOptions(data).map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!!historyEntry}
            onClick={() => {
              if (deadline) {
                setRemaining(Math.max(0, deadline - Date.now()));
                setDeadline(0);
              } else {
                if (sound && "AudioContext" in window) {
                  audio.current ??= new AudioContext();
                  void audio.current.resume().catch(() => {});
                }
                const length = remaining || duration[phase] * 60000;
                setRemaining(length);
                setDeadline(Date.now() + length);
              }
            }}
          >
            {deadline
              ? "Pause"
              : remaining && remaining !== duration[phase] * 60000
                ? "Resume"
                : "Start"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDeadline(0);
              setRemaining(duration[phase] * 60000);
            }}
          >
            Reset
          </Button>
        </div>
        {historyEntry && (
          <div className="mt-4 flex flex-wrap items-center gap-2" role="status">
            <span>Focus block complete.</span>
            <Button disabled={pending} size="sm" onClick={() => void record()}>
              Log focus session
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryEntry(undefined)}
            >
              Dismiss
            </Button>
          </div>
        )}
        <label className="mt-5 flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={sound}
            disabled={!!deadline}
            onChange={(event) => setSound(event.target.checked)}
          />
          Play a sound
        </label>
        <Button
          className="mt-2"
          type="button"
          variant="ghost"
          onClick={async () => {
            if (notify) {
              setNotify(false);
              return;
            }
            if (!window.Notification) {
              toast.error("Browser notifications are unavailable.");
              return;
            }
            try {
              const allowed =
                (await Notification.requestPermission()) === "granted";
              setNotify(allowed);
              if (!allowed) toast.info("Notification permission was declined.");
            } catch {
              toast.error("Could not enable notifications.");
            }
          }}
        >
          {notify ? "Turn off notifications" : "Enable notifications"}
        </Button>
      </Panel>
      <Panel title="Timer durations">
        <Form
          label="Apply durations"
          onSave={async (form) => {
            if (deadline) {
              toast.info("Pause the timer before changing durations.");
              return false;
            }
            const next = {
              Focus: Number(get(form, "Focus")),
              "Short break": Number(get(form, "Short break")),
              "Long break": Number(get(form, "Long break")),
            };
            setDuration(next);
            setRemaining(next[phase] * 60000);
            return true;
          }}
        >
          {phases.map((item) => (
            <Field
              key={item}
              label={`${item} (minutes)`}
              name={item}
              type="number"
              min={1}
              max={180}
              value={duration[item]}
            />
          ))}
        </Form>
      </Panel>
      <Panel title="Focus activity" className="lg:col-span-2">
        <p>
          {sessions.length} sessions today · {minutes} of {data.studyGoal} goal
          minutes · {data.study.reduce((sum, item) => sum + item.minutes, 0)}{" "}
          lifetime minutes
        </p>
        <progress
          className="mt-2 w-full accent-primary"
          aria-label="Daily focus goal"
          value={Math.min(minutes, data.studyGoal)}
          max={data.studyGoal}
        />
        {!data.study.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            Completed focus blocks appear here automatically.
          </p>
        )}
        <ul>
          {[...data.study]
            .sort((a, b) => b.ended.localeCompare(a.ended))
            .slice(0, 30)
            .map((item) => (
              <Row key={item.id} title={courseName(data, item.course)}>
                {item.minutes} min · {readable(item.ended, data.timezone)}
              </Row>
            ))}
        </ul>
      </Panel>
    </div>
  );
}

export function Flashcards() {
  const { data, save, pending } = useStudent();
  const [deckId, setDeck] = useState("");
  const [deckEdit, setDeckEdit] = useState("");
  const [cardEdit, setCardEdit] = useState("");
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [studying, setStudying] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const deck = data.decks.find((item) => item.id === deckId);
  const edit = data.decks.find((item) => item.id === deckEdit);
  const card = deck?.cards.find((item) => item.id === cardEdit);
  const current = deck?.cards.find((item) => item.id === queue[0]);
  const today = dateAt(data.timezone);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title={edit ? "Edit deck" : "Flashcard decks"}>
        <Form
          key={deckEdit}
          reset
          label={edit ? "Update deck" : "Create deck"}
          onSave={async (form) => {
            const next = {
              id: edit?.id ?? newId(),
              name: get(form, "name"),
              category: get(form, "category"),
              cards: edit?.cards ?? [],
            };
            const ok = await save({
              ...data,
              decks: replace(data.decks, next),
            });
            if (ok) {
              setDeck(next.id);
              setDeckEdit("");
              setStudying(false);
            }
            return ok;
          }}
        >
          <Field label="Deck name" name="name" value={edit?.name} />
          <Field
            label="Category"
            name="category"
            optional
            value={edit?.category}
          />
          {edit && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeckEdit("")}
            >
              Cancel edit
            </Button>
          )}
        </Form>
        <label className="mt-4 block text-sm">
          Search decks
          <input
            className="student-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <ul>
          {data.decks
            .filter((item) =>
              `${item.name} ${item.category}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((item) => (
              <Row
                key={item.id}
                title={item.name}
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-pressed={deckId === item.id}
                      onClick={() => {
                        setDeck(item.id);
                        setCardEdit("");
                        setStudying(false);
                      }}
                    >
                      Open deck
                    </Button>
                    <EditActions
                      title={item.name}
                      edit={() => setDeckEdit(item.id)}
                      remove={() =>
                        void save({
                          ...data,
                          decks: without(data.decks, item.id),
                        })
                      }
                    />
                  </>
                }
              >
                {item.category || "Uncategorized"} · {item.cards.length} cards ·{" "}
                {item.cards.filter((row) => row.due <= today).length} due
              </Row>
            ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!data.decks.length}
            onClick={() =>
              download(
                "flashcard-decks.json",
                JSON.stringify(data.decks, null, 2),
                "application/json",
              )
            }
          >
            Export JSON
          </Button>
          <label className="max-w-full text-sm">
            Import ToolNest JSON
            <input
              className="student-input"
              type="file"
              accept=".json,application/json"
              disabled={pending}
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                try {
                  if (file.size > 490_000) throw new Error();
                  const parsed = deckList.parse(JSON.parse(await file.text()));
                  const imported = parsed.map((item) => ({
                    ...item,
                    id: newId(),
                    cards: item.cards.map((row) => ({ ...row, id: newId() })),
                  }));
                  await save({ ...data, decks: [...data.decks, ...imported] });
                } catch {
                  toast.error(
                    "Choose a valid ToolNest deck export under 490 KB.",
                  );
                  operation("flashcard-maker", false);
                }
              }}
            />
          </label>
        </div>
      </Panel>
      <Panel title={deck?.name ?? "Study cards"}>
        {!deck ? (
          <p className="text-sm text-muted-foreground">
            Create or open a deck to manage cards and start a review.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {[false, true].map((shuffle) => (
                <Button
                  key={String(shuffle)}
                  variant="outline"
                  disabled={!deck.cards.some((row) => row.due <= today)}
                  onClick={() => {
                    const rows = deck.cards
                      .filter((row) => row.due <= today)
                      .map((row) => row.id);
                    if (shuffle)
                      for (let i = rows.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [rows[i], rows[j]] = [rows[j], rows[i]];
                      }
                    setQueue(rows);
                    setReviewed(0);
                    setFlipped(false);
                    setStudying(true);
                    setQuizMode(false);
                  }}
                >
                  {shuffle ? "Shuffle due cards" : "Study due cards"}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={!deck.cards.length}
                onClick={() => {
                  setStudying(false);
                  setQuizMode(true);
                  setQuizIndex(0);
                  setQuizScore(0);
                  setQuizSelected(null);
                  if (deck.cards[0]) {
                    const correct = deck.cards[0].back;
                    const others = deck.cards.filter((c) => c.id !== deck.cards[0].id).map((c) => c.back);
                    const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
                    setQuizOptions([correct, ...shuffledOthers].sort(() => Math.random() - 0.5));
                  }
                }}
              >
                Practice Quiz
              </Button>
              {(studying || quizMode) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStudying(false);
                    setQuizMode(false);
                  }}
                >
                  End {quizMode ? "quiz" : "review"}
                </Button>
              )}
            </div>
            {quizMode ? (
              <div className="rounded-xl border border-border p-4 bg-accent/20">
                {quizIndex < deck.cards.length ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>Question {quizIndex + 1} of {deck.cards.length}</span>
                      <span>Score: {quizScore}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4 mb-4">
                      <span className="text-xs text-muted-foreground block mb-1">Prompt / Question</span>
                      <p className="text-base font-medium">{deck.cards[quizIndex]?.front}</p>
                    </div>
                    <div className="grid gap-2">
                      {quizOptions.map((opt, i) => {
                        const correct = opt === deck.cards[quizIndex]?.back;
                        const isSelected = opt === quizSelected;
                        let btnStyle = "border-border bg-card hover:bg-accent text-foreground";
                        if (quizSelected !== null) {
                          if (correct) {
                            btnStyle = "bg-primary text-primary-foreground border-primary font-medium";
                          } else if (isSelected) {
                            btnStyle = "bg-destructive text-white border-destructive";
                          } else {
                            btnStyle = "opacity-50 border-border bg-card";
                          }
                        }
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={quizSelected !== null}
                            onClick={() => {
                              setQuizSelected(opt);
                              if (correct) setQuizScore((s) => s + 1);
                            }}
                            className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {quizSelected !== null && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() => {
                            const next = quizIndex + 1;
                            setQuizIndex(next);
                            setQuizSelected(null);
                            if (next < deck.cards.length && deck.cards[next]) {
                              const correct = deck.cards[next].back;
                              const others = deck.cards.filter((c) => c.id !== deck.cards[next].id).map((c) => c.back);
                              const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
                              setQuizOptions([correct, ...shuffledOthers].sort(() => Math.random() - 0.5));
                            }
                          }}
                        >
                          {quizIndex + 1 < deck.cards.length ? "Next Question" : "See Results"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <h4 className="text-lg font-semibold">Quiz Complete!</h4>
                    <p className="text-sm text-muted-foreground">
                      You scored {quizScore} out of {deck.cards.length} ({Math.round((quizScore / deck.cards.length) * 100)}%)
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQuizIndex(0);
                          setQuizScore(0);
                          setQuizSelected(null);
                          if (deck.cards[0]) {
                            const correct = deck.cards[0].back;
                            const others = deck.cards.filter((c) => c.id !== deck.cards[0].id).map((c) => c.back);
                            const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
                            setQuizOptions([correct, ...shuffledOthers].sort(() => Math.random() - 0.5));
                          }
                        }}
                      >
                        Try Again
                      </Button>
                      <Button onClick={() => setQuizMode(false)}>
                        Back to Deck
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : studying ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {reviewed} reviewed · {queue.length} remaining
                </p>
                {current ? (
                  <>
                    <button
                      type="button"
                      className="my-3 min-h-36 w-full rounded-xl border border-border bg-accent p-5 transition motion-safe:active:scale-[.98]"
                      onClick={() => setFlipped(!flipped)}
                      aria-label={`Flip card. ${flipped ? "Back" : "Front"}: ${flipped ? current.back : current.front}`}
                    >
                      <span className="block text-xs text-muted-foreground">
                        {flipped ? "Back" : "Front"} · tap to flip
                      </span>
                      <span
                        key={String(flipped)}
                        className="mt-2 block whitespace-pre-wrap wrap-anywhere motion-safe:animate-[student-card-flip_.2s_ease-out]"
                      >
                        {flipped ? current.back : current.front}
                      </span>
                    </button>
                    <div className="flex gap-2">
                      {[false, true].map((known) => (
                        <Button
                          key={String(known)}
                          disabled={!flipped || pending}
                          variant={known ? "default" : "outline"}
                          onClick={async () => {
                            if (
                              await save({
                                ...data,
                                decks: replace(data.decks, {
                                  ...deck,
                                  cards: replace(
                                    deck.cards,
                                    reviewCard(current, known, today),
                                  ),
                                }),
                              })
                            ) {
                              setQueue(queue.slice(1));
                              setReviewed(reviewed + 1);
                              setFlipped(false);
                            }
                          }}
                        >
                          {known ? "Known" : "Unknown"}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p role="status" className="mt-3">
                    Review complete.
                  </p>
                )}
              </>
            ) : (
              <>
                <Form
                  key={`${deck.id}-${cardEdit}`}
                  reset
                  label={card ? "Update card" : "Add card"}
                  onSave={async (form) => {
                    const ok = await save({
                      ...data,
                      decks: replace(data.decks, {
                        ...deck,
                        cards: replace(deck.cards, {
                          id: card?.id ?? newId(),
                          front: get(form, "front"),
                          back: get(form, "back"),
                          due: card?.due ?? today,
                          streak: card?.streak ?? 0,
                        }),
                      }),
                    });
                    if (ok) setCardEdit("");
                    return ok;
                  }}
                >
                  <Field
                    label="Front"
                    name="front"
                    multiline
                    max={500}
                    value={card?.front}
                  />
                  <Field
                    label="Back"
                    name="back"
                    multiline
                    max={2000}
                    value={card?.back}
                  />
                  {card && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCardEdit("")}
                    >
                      Cancel edit
                    </Button>
                  )}
                </Form>
                <ul>
                  {deck.cards.map((item) => (
                    <Row
                      key={item.id}
                      title={item.front}
                      actions={
                        <EditActions
                          title="card"
                          edit={() => setCardEdit(item.id)}
                          remove={() =>
                            void save({
                              ...data,
                              decks: replace(data.decks, {
                                ...deck,
                                cards: without(deck.cards, item.id),
                              }),
                            })
                          }
                        />
                      }
                    >
                      Due {item.due} · {item.streak} consecutive known reviews
                    </Row>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Known cards return after 1, 2, 4, 8 days and so on, up to 64 days.
              Unknown cards return tomorrow and reset the streak.
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}

export function Exams() {
  const { data, save, pending } = useStudent();
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState("");
  const [planEdit, setPlanEdit] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const exam = data.exams.find((item) => item.id === selected);
  const entry = data.exams.find((item) => item.id === editing);
  const plan = data.plans.find((item) => item.id === planEdit);
  const today = dateAt(data.timezone, now);
  const plannedToday = data.plans
    .filter((item) => item.date === today)
    .reduce((sum, item) => {
      const minutes = (time: string) =>
        Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      return sum + minutes(item.end) - minutes(item.start);
    }, 0);

  function exportExamsIcs() {
    if (!data.exams.length) return;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ToolNest Pro//Exam Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    for (const examItem of data.exams) {
      const course = data.courses.find((c) => c.id === examItem.course);
      const title = course ? `Exam: ${course.code ? course.code + " - " : ""}${course.name}` : "Exam";
      const examDate = new Date(examItem.date);
      const startStr = examDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const endStr = new Date(examDate.getTime() + 2 * 3600000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const topicsList = examItem.topics.map((t) => (t.done ? "[x] " : "[ ] ") + t.name).join("\\n");

      lines.push(
        "BEGIN:VEVENT",
        `UID:exam-${examItem.id}@toolnest.pro`,
        `DTSTAMP:${timestamp}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:Topics:\\n${topicsList || "None"}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Exam Tomorrow",
        "TRIGGER:-P1D",
        "END:VALARM",
        "END:VEVENT"
      );
    }
    lines.push("END:VCALENDAR");
    download("exam-schedule.ics", lines.join("\r\n"), "text/calendar;charset=utf-8");
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={entry ? "Edit exam" : "Add exam"}>
        {!data.courses.length ? (
          <CoursePrompt />
        ) : (
          <Form
            key={editing}
            reset
            label={entry ? "Update exam" : "Add exam"}
            onSave={async (form) => {
              const next: Student["exams"][number] = {
                id: entry?.id ?? newId(),
                course: get(form, "course"),
                date: toInstant(get(form, "date"), data.timezone),
                location: get(form, "location"),
                priority: get(form, "priority") as "Normal",
                topics: get(form, "topics")
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map(
                    (name) =>
                      entry?.topics.find((item) => item.name === name) ?? {
                        id: newId(),
                        name,
                        done: false,
                      },
                  ),
              };
              const ok = await save({
                ...data,
                exams: replace(data.exams, next),
              });
              if (ok) {
                setSelected(next.id);
                setEditing("");
              }
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
              label={`Exam date and time (${data.timezone})`}
              name="date"
              type="datetime-local"
              value={entry && localInstant(entry.date, data.timezone)}
            />
            <Field
              label="Exam location"
              name="location"
              optional
              value={entry?.location}
            />
            <Field
              label="Exam priority"
              name="priority"
              options={priority}
              value={entry?.priority ?? "Normal"}
            />
            <Field
              label="Topics (one per line)"
              name="topics"
              multiline
              optional
              value={entry?.topics.map((item) => item.name).join("\n")}
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
      <Panel title="Exam countdowns">
        <div className="mb-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={!data.exams.length}
            onClick={exportExamsIcs}
            title="Export exam schedule and alerts to Google Calendar / Apple Calendar"
          >
            Export Exams (.ics)
          </Button>
        </div>
        {!data.exams.length && (
          <p className="text-sm text-muted-foreground">No exams scheduled.</p>
        )}
        <ul>
          {[...data.exams]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((item) => {
              const left = minutesLeft(item.date, now);
              const done = item.topics.filter((topic) => topic.done).length;
              return (
                <Row
                  title={courseName(data, item.course)}
                  key={item.id}
                  actions={
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-pressed={selected === item.id}
                        onClick={() => {
                          setSelected(item.id);
                          setPlanEdit("");
                        }}
                      >
                        Open plan
                      </Button>
                      <EditActions
                        title="exam and its study blocks"
                        edit={() => setEditing(item.id)}
                        remove={() =>
                          void save({
                            ...data,
                            exams: without(data.exams, item.id),
                            plans: data.plans.filter(
                              (row) => row.exam !== item.id,
                            ),
                          })
                        }
                      />
                    </>
                  }
                >
                  {readable(item.date, data.timezone)} ·{" "}
                  {item.location || "Location open"} · {item.priority}
                  <br />
                  {left
                    ? `${Math.floor(left / 1440)}d ${Math.floor((left % 1440) / 60)}h ${left % 60}m remaining`
                    : "Exam time reached"}{" "}
                  · {done}/{item.topics.length} topics complete
                </Row>
              );
            })}
        </ul>
      </Panel>
      <Panel
        title={
          exam
            ? `Study topics · ${courseName(data, exam.course)}`
            : "Study topics"
        }
      >
        {!exam ? (
          <p className="text-sm text-muted-foreground">
            Open an exam to track its topics.
          </p>
        ) : (
          <>
            {!exam.topics.length && (
              <p className="text-sm text-muted-foreground">
                Edit the exam to add topics.
              </p>
            )}
            {exam.topics.map((item) => (
              <label
                className="flex items-center gap-2 py-2 text-sm"
                key={item.id}
              >
                <input
                  type="checkbox"
                  disabled={pending}
                  checked={item.done}
                  onChange={(event) =>
                    void save({
                      ...data,
                      exams: replace(data.exams, {
                        ...exam,
                        topics: replace(exam.topics, {
                          ...item,
                          done: event.target.checked,
                        }),
                      }),
                    })
                  }
                />
                {item.name}
              </label>
            ))}
          </>
        )}
      </Panel>
      <Panel title="Study schedule">
        <p className="mb-4 text-sm text-muted-foreground">
          {plannedToday} of {data.studyGoal} goal minutes scheduled today ·{" "}
          {data.timezone}
        </p>
        {exam ? (
          <Form
            key={`${exam.id}-${planEdit}`}
            reset
            label={plan ? "Update study block" : "Add study block"}
            onSave={async (form) => {
              toInstant(
                `${get(form, "date")}T${get(form, "start")}`,
                data.timezone,
              );
              toInstant(
                `${get(form, "date")}T${get(form, "end")}`,
                data.timezone,
              );
              const ok = await save({
                ...data,
                plans: replace(data.plans, {
                  id: plan?.id ?? newId(),
                  exam: exam.id,
                  date: get(form, "date"),
                  start: get(form, "start"),
                  end: get(form, "end"),
                  topic: get(form, "topic"),
                  done: plan?.done ?? false,
                }),
              });
              if (ok) setPlanEdit("");
              return ok;
            }}
          >
            <Field label="Study topic" name="topic" value={plan?.topic} />
            <Field
              label="Study date"
              name="date"
              type="date"
              value={plan?.date ?? today}
            />
            <Field
              label="Study start"
              name="start"
              type="time"
              value={plan?.start}
            />
            <Field label="Study end" name="end" type="time" value={plan?.end} />
            {plan && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPlanEdit("")}
              >
                Cancel edit
              </Button>
            )}
          </Form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Open an exam to add blocks.
          </p>
        )}
        <ul>
          {[...data.plans]
            .sort((a, b) =>
              `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
            )
            .map((item) => (
              <Row
                key={item.id}
                title={item.topic}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-pressed={item.done}
                      disabled={pending}
                      onClick={() =>
                        void save({
                          ...data,
                          plans: replace(data.plans, {
                            ...item,
                            done: !item.done,
                          }),
                        })
                      }
                    >
                      {item.done ? "Reopen" : "Complete"}
                    </Button>
                    <EditActions
                      title={item.topic}
                      edit={() => {
                        setSelected(item.exam);
                        setPlanEdit(item.id);
                      }}
                      remove={() =>
                        void save({
                          ...data,
                          plans: without(data.plans, item.id),
                        })
                      }
                    />
                  </>
                }
              >
                {item.date} · {item.start}–{item.end} ·{" "}
                {item.done ? "Complete" : "Planned"}
              </Row>
            ))}
        </ul>
      </Panel>
    </div>
  );
}
