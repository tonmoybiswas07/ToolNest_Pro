import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { setTimeout as pause } from "node:timers/promises";
import { MongoClient } from "mongodb";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { chromium } from "playwright";
import { studentTools, tools } from "../src/features/tools/registry.ts";

const require = createRequire(import.meta.url);
const mongo = new URL(
  process.env.TOOLNEST_TEST_MONGO ??
    "mongodb://127.0.0.1:37129/?replicaSet=toolnest-qa",
);
assert.equal(mongo.protocol, "mongodb:");
assert.ok(["localhost", "127.0.0.1"].includes(mongo.hostname));
assert.equal(mongo.username, "");
assert.equal(mongo.password, "");
mongo.pathname = `/toolnest_browser_${randomBytes(5).toString("hex")}`;
const client = new MongoClient(mongo.href, { serverSelectionTimeoutMS: 5000 });
const origin = "http://localhost:3194";
const command = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3194",
  ],
  {
    env: {
      ...process.env,
      MONGODB_URI: mongo.href,
      BETTER_AUTH_URL: origin,
      BETTER_AUTH_SECRET: randomBytes(48).toString("base64"),
      STUDENT_OPENAI_API_KEY: "",
      STUDENT_OPENAI_MODEL: "",
    },
    stdio: "ignore",
  },
);
const exited = new Promise((resolve) => command.once("close", resolve));
const toolPath = (slug) => `/student/tools/${slug}`;
let browser;

try {
  let ready;
  for (let i = 0; i < 80 && !ready; i++) {
    ready = await fetch(origin + "/api/auth/get-session").catch(() => null);
    if (!ready) await pause(150);
  }
  assert.equal(ready?.status, 200);
  browser = await chromium.launch({
    executablePath: process.env.TOOLNEST_TEST_BROWSER || undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    colorScheme: "light",
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const go = async (path, heading) => {
    assert.equal((await page.goto(origin + path)).status(), 200, path);
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  };
  const field = (name) =>
    page.getByLabel(name, { exact: typeof name === "string" });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const visible = (text) =>
    page
      .getByText(text, { exact: typeof text === "string" })
      .first()
      .waitFor();
  const openTool = async (slug) => {
    const tool = studentTools.find((item) => item.slug === slug);
    await go(toolPath(slug), tool.name);
  };
  async function accessibility(path, heading, width, dark, readyText) {
    await page.setViewportSize({ width, height: 900 });
    await go(path, heading);
    if (readyText)
      await page
        .getByRole("heading", { name: readyText, exact: true })
        .waitFor();
    const isDark = await page
      .locator("html")
      .evaluate((root) => root.classList.contains("dark"));
    if (isDark !== dark) await button("Toggle light and dark theme").click();
    await page.waitForFunction(
      (value) => document.documentElement.classList.contains("dark") === value,
      dark,
    );
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () =>
      (
        await window.axe.run("#main", {
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        })
      ).violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => node.target),
      })),
    );
    assert.deepEqual(
      violations,
      [],
      `${path} at ${width}px, ${dark ? "dark" : "light"}`,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Horizontal overflow at ${width}px`,
    );
  }

  await accessibility("/student", "Plan your semester.", 1440, false);
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await skip.focus();
  await page.waitForFunction(
    () => document.activeElement?.getBoundingClientRect().top >= 0,
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.hash === "#main");
  await accessibility("/student/tools", "Student tools", 768, true);
  await field("Search student tools").fill("missing_tool_xyz");
  await visible("No student tools match this search.");
  await field("Search student tools").fill("flashcard");
  await page.getByRole("link", { name: /Flashcard Maker/ }).waitFor();
  await accessibility("/student/dashboard", "Academic overview", 390, false);
  await visible("No open assignments.");
  console.log(
    "Responsive landing, directory, keyboard skip link, and empty dashboard passed.",
  );

  await go("/student/settings", "Student settings");
  await field("Course name").fill("Physics");
  await field("Course code").fill("PHY101");
  await button("Add course").click();
  await page.getByRole("heading", { name: "Physics", exact: true }).waitFor();
  await field("Time zone (IANA name)").fill("Asia/Dhaka");
  await button("Save").click();

  await openTool("assignment-tracker");
  await field("Assignment title").fill("Lab report");
  await field("Course").selectOption({ label: "PHY101 · Physics" });
  await field(/Deadline \(/).fill("2027-12-03T14:20");
  await button("Add assignment").click();
  await page
    .getByRole("heading", { name: "Lab report", exact: true })
    .waitFor();
  await button("Calendar view").click();
  await field("Calendar month").fill("2027-12");
  await visible(/Dec 3, 2027/);
  await button("List view").click();
  await page.getByRole("button", { name: "Edit Lab report" }).click();
  await field("Assignment title").fill("Revised lab report");
  await button("Update assignment").click();
  await page
    .getByRole("heading", { name: "Revised lab report", exact: true })
    .waitFor();
  await go("/student/dashboard", "Academic overview");
  await visible("Revised lab report");
  await openTool("assignment-tracker");
  await button("Complete").click();
  await visible(/Done · 100%/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Revised lab report" }).click();
  await visible("No matching deadlines.");

  await openTool("class-routine-maker");
  async function classForm(start, end) {
    await field("Course").selectOption({ label: "PHY101 · Physics" });
    await field("Start time").fill(start);
    await field("End time").fill(end);
    await button("Add class").click();
  }
  await classForm("09:00", "10:00");
  await visible("09:00–10:00 · Lecture");
  await classForm("09:30", "10:30");
  await visible(/Check for overlapping times/);
  await button("Show today").click();
  await visible("09:00–10:00 · Lecture");
  assert.ok((await page.pdf()).subarray(0, 5).equals(Buffer.from("%PDF-")));

  await openTool("attendance-tracker");
  await field("Course").selectOption({ label: "PHY101 · Physics" });
  await field("Session time").fill("08:00");
  await button("Record session").click();
  await visible(/100\.0% · Can miss/);
  await field("Course").selectOption({ label: "PHY101 · Physics" });
  await field("Session time").fill("08:00");
  await button("Record session").click();
  await visible("This attendance session is already recorded.");

  await openTool("cgpa-calculator");
  await field("Semester name").fill("Fall term");
  await page
    .getByRole("heading", { name: "Add semester", exact: true })
    .locator("..")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.getByRole("heading", { name: "Fall term", exact: true }).waitFor();
  await field("Course").selectOption({ label: "PHY101 · Physics" });
  await field("Semester").selectOption({ label: "Fall term" });
  await field("Letter grade").selectOption("A");
  await page
    .getByRole("heading", { name: "Add course grade" })
    .locator("..")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await visible("Semester GPA 4.00 · 3 counted credits");
  await field("Target CGPA").fill("3.8");
  await field("Additional counted credits").fill("3");
  await field("Expected average grade points").fill("3");
  await button("Calculate scenario").click();
  await visible(/Projected CGPA 3\.50/);

  await openTool("exam-study-planner");
  await field("Course").selectOption({ label: "PHY101 · Physics" });
  await field(/Exam date and time/).fill("2027-12-10T15:00");
  await field("Topics (one per line)").fill("Vectors\nGravity");
  await button("Add exam").click();
  await visible(/remaining · 0\/2 topics/);
  await field("Vectors").check();
  await visible(/remaining · 1\/2 topics/);
  await field("Study topic").fill("Gravity review");
  await field("Study date").fill("2027-12-09");
  await field("Study start").fill("15:00");
  await field("Study end").fill("16:00");
  await button("Add study block").click();
  await page.getByRole("heading", { name: "Gravity review" }).waitFor();

  await openTool("flashcard-maker");
  await field("Deck name").fill("Physics review");
  await button("Create deck").click();
  await field("Front").fill("What is inertia?");
  await field("Back").fill("Resistance to a change in motion.");
  await button("Add card").click();
  await button("Study due cards").click();
  await page.getByRole("button", { name: /Flip card/ }).click();
  await visible("Resistance to a change in motion.");
  await button("Known").click();
  await visible("Review complete.");

  await page.clock.install();
  await openTool("pomodoro-timer");
  await field("Focus (minutes)").fill("1");
  await button("Apply durations").click();
  await button("Start").click();
  await page.clock.fastForward(21000);
  await button("Pause").click();
  await button("Resume").waitFor();
  const paused = await page.getByRole("timer").textContent();
  assert.match(paused, /^0:[34]\d$/);
  await page.clock.fastForward(30000);
  assert.equal(await page.getByRole("timer").textContent(), paused);
  await button("Resume").click();
  await page.clock.fastForward(41000);
  await visible(/1 sessions today · 1 of/);
  console.log(
    "Browser CRUD, schedule conflict, attendance, GPA, exam, flashcards, and elapsed timer passed.",
  );

  await openTool("citation-generator");
  await field("Title").fill("The Practice of Research");
  await field(/Authors/).fill("Doe, Jane");
  await field("Year").fill("2020");
  await field("Publisher").fill("Academic Press");
  await button("Add reference").click();
  for (const [style, inText] of [
    ["apa", "(Doe, 2020)"],
    ["mla", "(Doe)"],
    ["ieee", "[1]"],
  ]) {
    await field("Citation style").selectOption(style);
    await button("Generate references").click();
    await visible(inText);
  }

  await openTool("ai-notes-summarizer");
  await visible(/AI summarization is unavailable/);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("Vectors describe direction and magnitude.", {
    x: 40,
    y: 730,
    font,
  });
  await field(/PDF \(up to/).setInputFiles({
    name: "physics.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await visible("PDF text extracted.");
  assert.match(
    await field("Paste or edit notes").inputValue(),
    /Vectors describe direction and magnitude/,
  );
  await page.getByText("Save a note", { exact: true }).click();
  await field("Note title").fill("Vector notes");
  await field("Note text").fill("Magnitude and direction");
  await button("Save note").click();
  await page.getByRole("heading", { name: "Vector notes" }).waitFor();

  const scan = await PDFDocument.create();
  const scanImage = await scan.embedPng(
    await sample("This is an image-only document.", undefined, "image/png"),
  );
  scan
    .addPage()
    .drawImage(scanImage, { x: 40, y: 700, width: 480, height: 80 });
  await field(/PDF \(up to/).setInputFiles({
    name: "scan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await scan.save()),
  });
  await visible("No selectable text found. Scanned pages need OCR first.");

  await openTool("ocr-image-to-text");
  async function sample(text, fontBytes, type) {
    return Buffer.from(
      await page.evaluate(
        async ({ text, fontBytes, type }) => {
          if (fontBytes) {
            const face = new FontFace(
              "BengaliQA",
              `url(data:font/woff2;base64,${fontBytes})`,
            );
            await face.load();
            document.fonts.add(face);
          }
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 180;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = fontBytes ? "64px BengaliQA" : "58px Arial";
          ctx.fillStyle = "black";
          ctx.fillText(text, 45, 115);
          return canvas.toDataURL(type, 0.95).split(",")[1];
        },
        { text, fontBytes, type },
      ),
      "base64",
    );
  }
  const banglaFont = await readFile(
    new URL(
      "../node_modules/@fontsource-variable/noto-sans-bengali/files/noto-sans-bengali-bengali-wght-normal.woff2",
      import.meta.url,
    ),
  );
  for (const [language, text, mime, name, font] of [
    ["eng", "Academic notes stay private.", "image/jpeg", "english.jpg"],
    [
      "ben",
      "আমি বাংলা পড়ি",
      "image/png",
      "bengali.png",
      banglaFont.toString("base64"),
    ],
    ["eng", "Light travels in a straight line.", "image/webp", "english.webp"],
  ]) {
    await field("Recognition language").selectOption(language);
    await field(/Image \(JPG/).setInputFiles({
      name,
      mimeType: mime,
      buffer: await sample(text, font, mime),
    });
    await button("Recognize text").click();
    await page.getByText(/Recognition complete/).waitFor({ timeout: 45000 });
    const extracted = (await field("Edit recognized text").inputValue())
      .trim()
      .normalize("NFC");
    assert.equal(extracted, text.normalize("NFC"), name);
  }
  console.log(
    "Browser CSL results, real PDF extraction, and printed English/Bengali OCR in JPG, PNG, and WebP passed.",
  );

  await accessibility(
    toolPath("assignment-tracker"),
    "Assignment & Deadline Tracker",
    390,
    true,
    "New assignment",
  );
  await accessibility(
    toolPath("flashcard-maker"),
    "Flashcard Maker",
    768,
    false,
    "Flashcard decks",
  );
  await page.setViewportSize({ width: 1440, height: 920 });
  for (const tool of tools.filter((item) => item.category !== "student")) {
    await go(`/tools/${tool.slug}`, tool.name);
    await page
      .getByText("Loading workspace…", { exact: true })
      .waitFor({ state: "hidden" });
    await page.locator("main").getByRole("button").first().waitFor();
  }
  const account = await context.request.post(
    origin + "/api/auth/sign-up/email",
    {
      headers: { origin },
      data: {
        name: "Browser student",
        email: "browser-student@example.com",
        password: "Local-test-password!",
      },
    },
  );
  assert.equal(account.status(), 200);
  await go("/student/settings", "Student settings");
  await visible("Changes sync to your account.");
  assert.equal(
    await page.getByRole("heading", { name: "Physics", exact: true }).count(),
    0,
  );
  await field("Course name").fill("Chemistry");
  await field("Course code").fill("CHEM102");
  await button("Add course").click();
  await page.getByRole("heading", { name: "Chemistry", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Chemistry", exact: true }).waitFor();
  await openTool("assignment-tracker");
  await button("Save to favorites").click();
  await button("Remove favorite").waitFor();
  await go("/student/dashboard", "Academic overview");
  await page
    .getByRole("heading", { name: "Favorite student tools", exact: true })
    .locator("..")
    .getByRole("link", { name: "Assignment & Deadline Tracker", exact: true })
    .waitFor();
  const imageFixture = {
    name: "dashboard.png",
    mimeType: "image/png",
    buffer: await sample("Test image", undefined, "image/png"),
  };
  await go("/tools/image-resizer", "Image Resizer");
  await field("Choose images").setInputFiles(imageFixture);
  await field("Lock aspect ratio").uncheck();
  await field("Width (px)").fill("240");
  await field("Height (px)").fill("90");
  await field("Preset name").fill("Dashboard preset");
  await button("Save preset").click();
  await visible("Preset saved on this device.");
  await button("Resize image").click();
  await page.getByRole("button", { name: /^Download dashboard/ }).waitFor();
  await go("/dashboard", "Your dashboard");
  await visible("Student snapshot");
  await visible("Output files created");
  assert.equal(
    await page
      .getByText("Output files created", { exact: true })
      .locator("..")
      .locator("dd")
      .textContent(),
    "1",
  );
  await page.getByRole("link", { name: /Dashboard preset/ }).click();
  await visible("Saved resize settings loaded. Choose a new source image.");
  await field("Choose images").setInputFiles(imageFixture);
  await field("Width (px)").waitFor();
  assert.equal(await field("Width (px)").inputValue(), "240");
  assert.equal(await field("Height (px)").inputValue(), "90");

  await go("/tools/pdf-compressor", "PDF Compressor");
  await field("Choose a PDF").setInputFiles({
    name: "source.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await field("Output size target (KB, optional)").fill("32");
  await button("Process PDF").click();
  await visible(/Within target .*32 KB target/);
  await go("/dashboard", "Your dashboard");
  const resume = page
    .getByRole("heading", { name: "Continue where you left off" })
    .locator("..");
  await resume.getByRole("link", { name: /PDF Compressor/ }).click();
  assert.equal(
    await field("Output size target (KB, optional)").inputValue(),
    "32",
  );

  await go("/dashboard", "Your dashboard");
  const pin = page.getByRole("button", {
    name: "Pin Merge PDF → Compress → Check size",
    exact: true,
  });
  await pin.click();
  await page
    .getByRole("button", {
      name: "Unpin Merge PDF → Compress → Check size",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("link", { name: /Merge PDF → Compress → Check size/ })
    .click();
  const bytes = Buffer.from(await pdf.save());
  await field("Choose PDF files").setInputFiles(
    ["first.pdf", "second.pdf"].map((name) => ({
      name,
      mimeType: "application/pdf",
      buffer: bytes,
    })),
  );
  await button("Run workflow").click();
  await button("Download merged.pdf").waitFor();
  await visible(/Within target .*2048 KB target/);

  await go(
    "/dashboard/workflows/resize-compress",
    "Resize → Compress → Export",
  );
  await field("Choose an image").setInputFiles(imageFixture);
  await button("Run workflow").click();
  await page
    .getByRole("button", { name: /^Download dashboard.*jpg/ })
    .waitFor();

  await page.evaluate(() => {
    localStorage.setItem(
      "toolnest-notes-v1",
      JSON.stringify([
        {
          id: "first",
          title: "First draft",
          content: "Unrelated",
          tags: "",
          updated: 1,
          pinned: false,
        },
        {
          id: "second",
          title: "Dashboard draft",
          content: "Open this exact draft",
          tags: "",
          updated: 2,
          pinned: false,
        },
      ]),
    );
  });
  await go("/dashboard", "Your dashboard");
  await page.getByRole("link", { name: /Dashboard draft/ }).click();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("textarea")).some(
      (input) => input.value === "Open this exact draft",
    ),
  );
  console.log(
    "Dashboard resume, presets, both workflows, draft links, student snapshot, and measured file results passed.",
  );
  assert.deepEqual(pageErrors, []);
  console.log(
    "Authenticated browser sync and favorites passed; all 30 legacy workspaces opened.",
  );
} finally {
  await browser?.close();
  command.kill();
  await exited;
  try {
    await client.db().dropDatabase();
  } finally {
    await client.close();
  }
}
