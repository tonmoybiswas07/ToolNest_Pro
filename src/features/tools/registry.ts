import {
  Braces, Calculator, CaseSensitive, Clock, CodeXml, Crop,
  FileImage, Files, FileText, Fingerprint, Hash, Image, Instagram,
  Link, Layers3, LockKeyhole, Music2, NotebookPen, Palette, Percent, QrCode, Regex,
  Ruler, ScanLine, Scissors, ShieldCheck, Share2, Shrink, Sparkles, Stamp, Type, Video,
  type LucideIcon,
} from "lucide-react";

export const categories = {
  image: { name: "Image", description: "Resize, convert, and refine images.", icon: Image, tone: "violet" },
  document: { name: "Documents", description: "Organize PDFs and convert documents.", icon: Files, tone: "blue" },
  developer: { name: "Developer", description: "Format, encode, and inspect data.", icon: CodeXml, tone: "mint" },
  text: { name: "Text", description: "Count, clean, and compare your writing.", icon: Type, tone: "pink" },
  design: { name: "Design", description: "Explore colors and create visual assets.", icon: Palette, tone: "amber" },
  utility: { name: "Utilities", description: "Handle everyday calculations and conversions.", icon: Calculator, tone: "cyan" },
  social: { name: "Social Media", description: "Explore planned video download utilities.", icon: Share2, tone: "indigo" },
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
  { slug: "image-compressor", name: "Image Compressor", category: "image", description: "Reduce image file sizes for faster sharing.", icon: Shrink },
  { slug: "image-resizer", name: "Image Resizer", category: "image", description: "Set new dimensions for an image.", icon: ScanLine },
  { slug: "image-converter", name: "Image Converter", category: "image", description: "Convert images between common file formats.", icon: FileImage },
  { slug: "image-cropper", name: "Image Cropper", category: "image", description: "Crop images to a specific area or aspect ratio.", icon: Crop },
  { slug: "image-watermark", name: "Image Watermark", category: "image", description: "Add a text or image watermark to a picture.", icon: Stamp },
  { slug: "pdf-merger", name: "PDF Merger", category: "document", description: "Combine multiple PDFs into one file.", icon: Files },
  { slug: "pdf-splitter", name: "PDF Splitter", category: "document", description: "Extract pages or split a PDF into smaller files.", icon: Scissors },
  { slug: "pdf-compressor", name: "PDF Compressor", category: "document", description: "Reduce PDF file sizes for easier sharing.", icon: Shrink },
  { slug: "pdf-to-image", name: "PDF to Image", category: "document", description: "Export PDF pages as individual images.", icon: FileImage },
  { slug: "image-to-pdf", name: "Image to PDF", category: "document", description: "Turn one or more images into a PDF.", icon: FileText },
  { slug: "json-studio", name: "JSON Studio", category: "developer", description: "Format, compare, and inspect JSON or generate TypeScript types.", icon: Braces, available: true, previousSlug: "json-formatter" },
  { slug: "jwt-inspector", name: "JWT Inspector", category: "developer", description: "Decode JWT claims locally and inspect token timing.", icon: ShieldCheck, available: true, previousSlug: "base64-converter" },
  { slug: "url-encoder", name: "URL Encoder & Decoder", category: "developer", description: "Encode and decode URL components.", icon: Link },
  { slug: "regex-lab", name: "Regex Lab", category: "developer", description: "Test regular expressions and explore capture groups.", icon: Regex, available: true, previousSlug: "regex-tester" },
  { slug: "hash-generator", name: "Hash Generator", category: "developer", description: "Generate hashes from text for comparison or verification.", icon: Hash },
  { slug: "word-counter", name: "Word Counter", category: "text", description: "Count words, characters, and lines in pasted text.", icon: Type },
  { slug: "case-converter", name: "Case Converter", category: "text", description: "Switch between uppercase, lowercase, and other text styles.", icon: CaseSensitive },
  { slug: "code-diff-studio", name: "Code Diff Studio", category: "developer", description: "Compare code side by side and export a unified patch.", icon: CodeXml, available: true, previousSlug: "text-diff" },
  { slug: "smart-notes-studio", name: "Smart Notes Studio", category: "text", description: "Write, organize, and export private Markdown notes.", icon: NotebookPen, available: true, previousSlug: "duplicate-line-remover" },
  { slug: "prompt-builder", name: "Prompt Builder", category: "text", description: "Compose structured prompts and save reusable templates locally.", icon: Sparkles, available: true, previousSlug: "lorem-ipsum-generator" },
  { slug: "color-converter", name: "Color Converter", category: "design", description: "Convert color values between HEX, RGB, and HSL.", icon: Palette },
  { slug: "color-system-generator", name: "Color System Generator", category: "design", description: "Generate shades, tokens, and WCAG contrast ratios.", icon: Palette, available: true, previousSlug: "palette-generator" },
  { slug: "gradient-studio", name: "Gradient Studio", category: "design", description: "Build linear and radial gradients and export CSS.", icon: Palette, available: true, previousSlug: "gradient-builder" },
  { slug: "glassmorphism-builder", name: "Glassmorphism Builder", category: "design", description: "Design glass effects and export matching CSS.", icon: Layers3, available: true, previousSlug: "contrast-checker" },
  { slug: "qr-code-studio", name: "QR Code Studio", category: "design", description: "Create and export QR codes for links, text, Wi-Fi, and contacts.", icon: QrCode, available: true, previousSlug: "qr-code-generator" },
  { slug: "password-generator", name: "Password Generator", category: "utility", description: "Generate a password with configurable length and characters.", icon: LockKeyhole },
  { slug: "uuid-generator", name: "UUID Generator", category: "utility", description: "Generate unique identifiers for tests and records.", icon: Fingerprint },
  { slug: "unit-converter", name: "Unit Converter", category: "utility", description: "Convert units of length, weight, temperature, and more.", icon: Ruler },
  { slug: "percentage-calculator", name: "Percentage Calculator", category: "utility", description: "Work out proportions and percentage changes.", icon: Percent },
  { slug: "timestamp-converter", name: "Timestamp Converter", category: "utility", description: "Convert Unix timestamps to readable dates and back.", icon: Clock },
  { slug: "instagram-video-downloader", name: "Instagram Video Downloader", category: "social", description: "A planned downloader for Instagram video links.", icon: Instagram },
  { slug: "tiktok-video-downloader", name: "TikTok Video Downloader", category: "social", description: "A planned downloader for TikTok video links.", icon: Music2 },
  { slug: "threads-video-downloader", name: "Threads Video Downloader", category: "social", description: "A planned downloader for Threads video links.", icon: Video },
];

export const tools = definitions.map(({ available, ...tool }) => ({ ...tool, status: available ? "Available" as const : "Coming Soon" as const }));
export type Tool = (typeof tools)[number];

const featuredSlugs = new Set([
  "image-compressor", "pdf-merger", "json-studio", "word-counter",
  "qr-code-studio", "instagram-video-downloader",
]);

export const featuredTools = tools.filter((tool) => featuredSlugs.has(tool.slug));
