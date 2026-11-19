import Link from "next/link";
import { Layers3 } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" className="inline-flex w-fit items-center gap-2.5 font-bold tracking-tight" aria-label="ToolNest Pro home">
      <span className="brand-mark"><Layers3 size={19} aria-hidden /></span>
      <span>ToolNest <span className="font-semibold text-highlight">Pro</span></span>
    </Link>
  );
}
