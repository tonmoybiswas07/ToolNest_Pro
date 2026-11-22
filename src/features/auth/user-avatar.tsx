"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { profileImageUrl } from "./profile-image";

export function UserAvatar({
  name,
  image,
  large = false,
}: {
  name: string;
  image?: string | null;
  large?: boolean;
}) {
  const src = profileImageUrl(image);
  const [failed, setFailed] = useState<string>();
  const size = large ? 64 : 36;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-highlight/25 bg-highlight/10 font-semibold text-highlight",
        large ? "size-16 text-xl" : "size-9 text-xs",
      )}
    >
      {src && src !== failed ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
          className="size-full object-cover"
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
