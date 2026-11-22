import {
  Binary, Braces, Calculator, CaseSensitive, Clock, CodeXml, Crop,
  FileImage, Files, FileText, Fingerprint, Hash, Image, GraduationCap, CalendarDays, CalendarCheck, BookOpen, Timer,
  Link, Layers3, LockKeyhole, NotebookPen, Palette, Percent, QrCode, Regex,
  Ruler, ScanLine, Scissors, Server, ShieldCheck, Shrink, Sparkles, Stamp, Type, Eye,
  AlignLeft, Square, Video,
  type LucideIcon,
} from "lucide-react";

export const categories = {
  image: { name: "Image", description: "Resize, convert, and refine images.", icon: Image, tone: "violet" },
  document: { name: "Documents", description: "Organize PDFs and convert documents.", icon: Files, tone: "blue" },
  developer: { name: "Developer", description: "Format, encode, and inspect data.", icon: CodeXml, tone: "mint" },
  text: { name: "Text", description: "Count, clean, and compare your writing.", icon: Type, tone: "pink" },
  design: { name: "Design", description: "Explore colors and create visual assets.", icon: Palette, tone: "amber" },
  utility: { name: "Utilities", description: "Handle everyday calculations and conversions.", icon: Calculator, tone: "cyan" },
  social: { name: "Social Media", description: "Download videos you have permission to save.", icon: Video, tone: "pink" },
  student: { name: "Student Hub", description: "Plan classes, study sessions, and academic work.", icon: GraduationCap, tone: "indigo" },
} as const;

export type CategoryId = keyof typeof categories;
export const categoryIds = Object.keys(categories) as CategoryId[];

type ToolDefinition = {
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  icon: LucideIcon;
  previousSlug?: string;
  available?: true;
};

const definitions: ToolDefinition[] = [
  { slug: "image-compressor", name: "Image Compressor", category: "image", description: "Reduce JPG, PNG, and WebP file sizes and compare the actual output.", icon: Shrink, available: true },
  { slug: "image-resizer", name: "Image Resizer", category: "image", description: "Crop and resize images to precise dimensions.", icon: ScanLine, available: true },
  { slug: "image-converter", name: "Image Converter", category: "image", description: "Batch-convert images between JPG, PNG, and WebP.", icon: FileImage, available: true },
  { slug: "image-editor", name: "Image Editor", category: "image", description: "Crop, rotate, flip, and adjust images in your browser.", icon: Crop, available: true, previousSlug: "image-cropper" },
  { slug: "social-media-image-studio", name: "Social Media Image Studio", category: "image", description: "Design platform-sized images with text and image watermarks.", icon: Stamp, available: true, previousSlug: "image-watermark" },
  { slug: "pdf-merger", name: "PDF Merge", category: "document", description: "Combine PDF documents in the order you choose.", icon: Files, available: true },
  { slug: "pdf-splitter", name: "PDF Split", category: "document", description: "Extract ordered page ranges or export individual PDFs.", icon: Scissors, available: true },
  { slug: "pdf-compressor", name: "PDF Compressor", category: "document", description: "Repack PDF objects or explicitly flatten pages to JPEG for smaller files.", icon: Shrink, available: true },
  { slug: "pdf-toolkit", name: "PDF Toolkit", category: "document", description: "Edit PDF pages or use Text to PDF, Image to PDF, and PDF to Image locally.", icon: FileText, available: true },
  { slug: "background-remover", name: "Image Background Remover", category: "image", description: "Isolate people in photos and export transparent or solid-background PNGs.", icon: Image, available: true },
  { slug: "json-studio", name: "JSON Studio", category: "developer", description: "Format, compare, and inspect JSON or generate TypeScript types.", icon: Braces, available: true, previousSlug: "json-formatter" },
  { slug: "jwt-inspector", name: "JWT Inspector", category: "developer", description: "Decode JWT claims locally and inspect token timing.", icon: ShieldCheck, available: true, previousSlug: "base64-converter" },
  { slug: "url-encoder", name: "URL Encoder & Decoder", category: "developer", description: "Encode and decode URL components.", icon: Link, available: true },
  { slug: "regex-lab", name: "Regex Lab", category: "developer", description: "Test regular expressions and explore capture groups.", icon: Regex, available: true, previousSlug: "regex-tester" },
  { slug: "hash-generator", name: "Hash Generator", category: "developer", description: "Generate hashes from text for comparison or verification.", icon: Hash, available: true },
  { slug: "word-counter", name: "Word Counter", category: "text", description: "Count words, characters, and lines in pasted text.", icon: Type, available: true },
  { slug: "case-converter", name: "Case Converter", category: "text", description: "Switch between uppercase, lowercase, and other text styles.", icon: CaseSensitive, available: true },
  { slug: "code-diff-studio", name: "Code Diff Studio", category: "developer", description: "Compare code side by side and export a unified patch.", icon: CodeXml, available: true, previousSlug: "text-diff" },
  { slug: "smart-notes-studio", name: "Smart Notes Studio", category: "text", description: "Write, organize, and export private Markdown notes.", icon: NotebookPen, available: true, previousSlug: "duplicate-line-remover" },
  { slug: "prompt-builder", name: "Prompt Builder", category: "text", description: "Compose structured prompts and save reusable templates locally.", icon: Sparkles, available: true },
  { slug: "color-converter", name: "Color Converter", category: "design", description: "Convert color values between HEX, RGB, and HSL.", icon: Palette, available: true },
  { slug: "color-system-generator", name: "Color System Generator", category: "design", description: "Generate shades, tokens, and WCAG contrast ratios.", icon: Palette, available: true, previousSlug: "palette-generator" },
  { slug: "gradient-studio", name: "Gradient Studio", category: "design", description: "Build linear and radial gradients and export CSS.", icon: Palette, available: true, previousSlug: "gradient-builder" },
  { slug: "glassmorphism-builder", name: "Glassmorphism Builder", category: "design", description: "Design glass effects and export matching CSS.", icon: Layers3, available: true },
  { slug: "qr-code-studio", name: "QR Code Studio", category: "design", description: "Create and export QR codes for links, text, Wi-Fi, and contacts.", icon: QrCode, available: true, previousSlug: "qr-code-generator" },
  { slug: "password-generator", name: "Password Generator", category: "utility", description: "Generate a password with configurable length and characters.", icon: LockKeyhole, available: true },
  { slug: "uuid-generator", name: "UUID Generator", category: "utility", description: "Generate unique identifiers for tests and records.", icon: Fingerprint, available: true },
  { slug: "unit-converter", name: "Unit Converter", category: "utility", description: "Convert units of length, weight, temperature, and more.", icon: Ruler, available: true },
  { slug: "percentage-calculator", name: "Percentage Calculator", category: "utility", description: "Work out proportions and percentage changes.", icon: Percent, available: true },
  { slug: "timestamp-converter", name: "Timestamp Converter", category: "utility", description: "Convert Unix timestamps to readable dates and back.", icon: Clock, available: true },
  { slug: "base64-studio", name: "Base64 Studio", category: "developer", description: "Encode and decode text as Base64 or convert images to data URIs.", icon: Binary, available: true },
  { slug: "cron-builder", name: "Cron Expression Builder", category: "developer", description: "Build and preview cron expressions with a visual editor.", icon: Clock, available: true },
  { slug: "http-status-reference", name: "HTTP Status Reference", category: "developer", description: "Quick reference for all HTTP status codes with descriptions.", icon: Server, available: true },
  { slug: "markdown-preview", name: "Markdown Preview", category: "text", description: "Write Markdown and see a live preview. Export to HTML or download as .md.", icon: Eye, available: true },
  { slug: "lorem-ipsum-generator", name: "Lorem Ipsum Generator", category: "text", description: "Generate placeholder text in paragraphs, sentences, or words.", icon: AlignLeft, available: true },
  { slug: "box-shadow-generator", name: "Box Shadow Generator", category: "design", description: "Build layered CSS box-shadow effects with a live visual preview.", icon: Square, available: true },
  { slug: "typography-scale", name: "Typography Scale Generator", category: "design", description: "Create a type scale from a base size and ratio. Export as CSS variables.", icon: Type, available: true },
  { slug: "json-to-csv", name: "JSON to CSV", category: "developer", description: "Convert JSON records to a downloadable CSV table.", icon: Braces, available: true },
  { slug: "url-query-parser", name: "URL Query Parser", category: "developer", description: "Extract decoded query parameters and preserve repeated keys.", icon: Link, available: true },
  { slug: "html-entity-converter", name: "HTML Entity Converter", category: "developer", description: "Encode text for HTML or decode character references.", icon: CodeXml, available: true },
  { slug: "line-sorter", name: "Line Sorter", category: "text", description: "Sort lines alphabetically or by natural numeric order.", icon: AlignLeft, available: true },
  { slug: "text-cleaner", name: "Text Cleaner", category: "text", description: "Trim whitespace, remove blank lines, and optionally deduplicate lines.", icon: Type, available: true },
  { slug: "number-base-converter", name: "Number Base Converter", category: "utility", description: "Convert exact integers between bases 2 through 36.", icon: Binary, available: true },
  { slug: "loan-calculator", name: "Loan Calculator", category: "utility", description: "Estimate fixed-rate monthly payments, interest, and total repayment.", icon: Calculator, available: true },
  { slug: "date-difference-calculator", name: "Date Difference Calculator", category: "utility", description: "Count calendar days and weeks between two dates.", icon: CalendarDays, available: true },
  { slug: "tip-calculator", name: "Tip Calculator", category: "utility", description: "Calculate a tip and split the total among people.", icon: Percent, available: true },
  { slug: "aspect-ratio-calculator", name: "Aspect Ratio Calculator", category: "utility", description: "Simplify dimensions to a ratio and calculate proportional sizes.", icon: Crop, available: true },
  { slug: "duration-calculator", name: "Duration Calculator", category: "utility", description: "Add a list of durations in hours, minutes, and seconds.", icon: Timer, available: true },
  { slug: "image-color-picker", name: "Image Color Picker", category: "image", description: "Sample an exact pixel from a local image and copy its color.", icon: Palette, available: true },
  { slug: "favicon-generator", name: "Favicon Generator", category: "design", description: "Generate favicon PNG sizes and a multi-size ICO file from one image.", icon: FileImage, available: true },
  { slug: "contrast-checker", name: "Contrast Checker", category: "design", description: "Check two colors against WCAG contrast thresholds.", icon: Eye, available: true },
  { slug: "image-inspector", name: "Image Inspector", category: "image", description: "Check a local image’s dimensions, file size, and aspect ratio.", icon: ScanLine, available: true },
  { slug: "study-notes-organizer", name: "Study Notes Organizer", category: "student", description: "Create, tag, search, and export a local study notebook.", icon: NotebookPen, available: true },
  { slug: "instagram-video-downloader", name: "Instagram Video Downloader", category: "social", description: "Save permitted Instagram videos through the configured download provider.", icon: Video, available: true },
  { slug: "tiktok-video-downloader", name: "TikTok Video Downloader", category: "social", description: "Save permitted TikTok videos through the configured download provider.", icon: Video, available: true },
  { slug: "threads-video-downloader", name: "Threads Video Downloader", category: "social", description: "Save permitted Threads videos through the configured download provider.", icon: Video, available: true },
  { slug: "assignment-tracker", name: "Assignment & Deadline Tracker", category: "student", description: "Organize deadlines and track assignment progress.", icon: CalendarCheck, available: true },
  { slug: "class-routine-maker", name: "Smart Class Routine Maker", category: "student", description: "Build a weekly timetable and catch overlapping classes.", icon: CalendarDays, available: true },
  { slug: "attendance-tracker", name: "Smart Attendance Tracker", category: "student", description: "Log classes and plan around your attendance target.", icon: Percent, available: true },
  { slug: "cgpa-calculator", name: "CGPA & GPA Calculator", category: "student", description: "Calculate weighted grades and explore target outcomes.", icon: GraduationCap, available: true },
  { slug: "ai-notes-summarizer", name: "AI PDF & Notes Summarizer", category: "student", description: "Extract PDF text and generate study summaries when AI is configured.", icon: Sparkles, available: true },
  { slug: "citation-generator", name: "Citation & Reference Generator", category: "student", description: "Build citations and bibliographies from source metadata.", icon: BookOpen, available: true },
  { slug: "pomodoro-timer", name: "Pomodoro Study Timer", category: "student", description: "Time focus blocks, take breaks, and review study activity.", icon: Timer, available: true },
  { slug: "flashcard-maker", name: "Flashcard Maker", category: "student", description: "Create flashcards and review study decks with spaced repetition.", icon: Layers3, available: true },
  { slug: "exam-study-planner", name: "Exam Countdown & Study Planner", category: "student", description: "Plan study blocks, topics, and upcoming exams.", icon: CalendarDays, available: true },
  { slug: "ocr-image-to-text", name: "OCR Image to Text", category: "student", description: "Recognize printed text from images on your device.", icon: ScanLine, available: true },
];

export const tools = definitions.map(({ available, ...tool }) => ({ ...tool, status: available ? "Available" as const : "Requires Setup" as const }));
export type Tool = (typeof tools)[number];

export const legacyToolRoutes = new Map<string, { slug: string; mode?: string }>();
for (const tool of tools) {
  if (tool.previousSlug) legacyToolRoutes.set(tool.previousSlug, { slug: tool.slug });
}
legacyToolRoutes.set("pdf-to-image", { slug: "pdf-toolkit", mode: "pdf-to-image" });
legacyToolRoutes.set("image-to-pdf", { slug: "pdf-toolkit", mode: "image-to-pdf" });
legacyToolRoutes.set("pdf-merge", { slug: "pdf-merger" });
legacyToolRoutes.set("pdf-split", { slug: "pdf-splitter" });

export const canonicalToolSlug = (slug: string) => legacyToolRoutes.get(slug)?.slug ?? slug;
export const findTool = (slug: string) => tools.find(tool => tool.slug === canonicalToolSlug(slug));

const featuredSlugs = new Set([
  "image-compressor", "pdf-merger", "json-studio", "word-counter",
  "qr-code-studio", "assignment-tracker",
]);

export const featuredTools = tools.filter((tool) => featuredSlugs.has(tool.slug));

export const toolHref = (tool: Tool) => tool.category === "student" ? `/student/tools/${tool.slug}` : `/tools/${tool.slug}`;
export const studentTools = tools.filter(tool => tool.category === "student");

export const signInOnlyTools: ReadonlySet<string> = new Set([
  "instagram-video-downloader",
  "tiktok-video-downloader",
  "threads-video-downloader",
  "assignment-tracker",
  "class-routine-maker",
  "attendance-tracker",
  "flashcard-maker",
  "exam-study-planner",
  "social-media-image-studio",
  "color-system-generator",
  "background-remover",
  "smart-notes-studio",
  "prompt-builder",
  "gradient-studio",
  "glassmorphism-builder",
  "code-diff-studio",
  "regex-lab",
  "pdf-toolkit",
]);
