import {
  Binary, Braces, Calculator, CaseSensitive, Clock, CodeXml, Crop,
  FileImage, Files, FileText, Fingerprint, Hash, Image, Instagram,
  Link, ListFilter, LockKeyhole, Music2, Palette, Percent, QrCode, Regex,
  Ruler, ScanLine, Scissors, Share2, Shrink, Stamp, Type, Video, WrapText,
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
  { slug: "json-formatter", name: "JSON Formatter", category: "developer", description: "Format and validate JSON for easier reading.", icon: Braces },
  { slug: "base64-converter", name: "Base64 Encoder & Decoder", category: "developer", description: "Encode text to Base64 or decode it back.", icon: Binary },
  { slug: "url-encoder", name: "URL Encoder & Decoder", category: "developer", description: "Encode and decode URL components.", icon: Link },
  { slug: "regex-tester", name: "Regex Tester", category: "developer", description: "Preview regular expression matches against sample text.", icon: Regex },
  { slug: "hash-generator", name: "Hash Generator", category: "developer", description: "Generate hashes from text for comparison or verification.", icon: Hash },
  { slug: "word-counter", name: "Word Counter", category: "text", description: "Count words, characters, and lines in pasted text.", icon: Type },
  { slug: "case-converter", name: "Case Converter", category: "text", description: "Switch between uppercase, lowercase, and other text styles.", icon: CaseSensitive },
  { slug: "text-diff", name: "Text Diff Checker", category: "text", description: "Compare two versions of text and highlight changed lines.", icon: Files },
  { slug: "duplicate-line-remover", name: "Duplicate Line Remover", category: "text", description: "Clean up a list by removing repeated lines.", icon: ListFilter },
  { slug: "lorem-ipsum-generator", name: "Lorem Ipsum Generator", category: "text", description: "Generate placeholder text for layouts and prototypes.", icon: WrapText },
  { slug: "color-converter", name: "Color Converter", category: "design", description: "Convert color values between HEX, RGB, and HSL.", icon: Palette },
  { slug: "palette-generator", name: "Palette Generator", category: "design", description: "Build a coordinated palette for a design project.", icon: Palette },
  { slug: "gradient-builder", name: "CSS Gradient Builder", category: "design", description: "Create gradients and copy the matching CSS.", icon: CodeXml },
  { slug: "contrast-checker", name: "Contrast Checker", category: "design", description: "Check contrast between text and background colors.", icon: ScanLine },
  { slug: "qr-code-generator", name: "QR Code Generator", category: "design", description: "Create a QR code from a link or text.", icon: QrCode },
  { slug: "password-generator", name: "Password Generator", category: "utility", description: "Generate a password with configurable length and characters.", icon: LockKeyhole },
  { slug: "uuid-generator", name: "UUID Generator", category: "utility", description: "Generate unique identifiers for tests and records.", icon: Fingerprint },
  { slug: "unit-converter", name: "Unit Converter", category: "utility", description: "Convert units of length, weight, temperature, and more.", icon: Ruler },
  { slug: "percentage-calculator", name: "Percentage Calculator", category: "utility", description: "Work out proportions and percentage changes.", icon: Percent },
  { slug: "timestamp-converter", name: "Timestamp Converter", category: "utility", description: "Convert Unix timestamps to readable dates and back.", icon: Clock },
  { slug: "instagram-video-downloader", name: "Instagram Video Downloader", category: "social", description: "A planned downloader for Instagram video links.", icon: Instagram },
  { slug: "tiktok-video-downloader", name: "TikTok Video Downloader", category: "social", description: "A planned downloader for TikTok video links.", icon: Music2 },
  { slug: "threads-video-downloader", name: "Threads Video Downloader", category: "social", description: "A planned downloader for Threads video links.", icon: Video },
];

export const tools = definitions.map((tool) => ({ ...tool, status: "Coming Soon" as const }));
export type Tool = (typeof tools)[number];

const featuredSlugs = new Set([
  "image-compressor", "pdf-merger", "json-formatter", "word-counter",
  "qr-code-generator", "instagram-video-downloader",
]);

export const featuredTools = tools.filter((tool) => featuredSlugs.has(tool.slug));
