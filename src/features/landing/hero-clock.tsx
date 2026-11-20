"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { useSyncExternalStore } from "react";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "full" });
const zone = clockFormat
  .resolvedOptions()
  .timeZone.replace(/_/g, " ")
  .replaceAll("/", " / ");

function subscribe(refresh: () => void) {
  const interval = window.setInterval(refresh, 250);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", refresh);
  };
}

const currentSecond = () => Math.floor(Date.now() / 1000);
const serverTime = () => null;

export function HeroClock({
  toolCount,
  categoryCount,
}: {
  toolCount: number;
  categoryCount: number;
}) {
  const seconds = useSyncExternalStore(subscribe, currentSecond, serverTime);
  const now = seconds === null ? null : new Date(seconds * 1000);
  const [hour = "––", minute = "––", second = "––"] = now
    ? clockFormat.format(now).split(":")
    : [];

  return (
    <section
      aria-labelledby="hero-clock-heading"
      className="surface hero-clock w-full min-w-0 overflow-hidden lg:justify-self-end"
    >
      <div className="px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
        <h2
          id="hero-clock-heading"
          className="flex items-center gap-2 text-sm font-semibold text-highlight"
        >
          <Clock3 size={17} aria-hidden />
          Local time
        </h2>
        <div className="my-4 min-w-0 sm:my-6">
          <time
            dateTime={now?.toISOString()}
            className="flex items-baseline gap-1.5 whitespace-nowrap sm:gap-3"
          >
            <span className="text-[clamp(2.75rem,9.5vw,5.25rem)] leading-none font-semibold tracking-[-.075em] tabular-nums">
              {hour}:{minute}
            </span>
            <span className="text-2xl font-medium tabular-nums text-[var(--amber)] sm:text-3xl">
              :{second}
            </span>
          </time>
        </div>
        <p className="min-h-6 text-base font-medium">
          {now ? dateFormat.format(now) : "Reading your local date…"}
        </p>
        <p className="mt-1 min-h-5 text-sm break-words text-muted-foreground">
          {now ? zone : null}
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Link
          href="/tools"
          className="flex min-w-0 items-center justify-between gap-2 px-4 py-3 hover:bg-accent sm:px-8"
        >
          <span className="min-w-0">
            <strong className="block text-lg tabular-nums">{toolCount}</strong>
            <span className="block text-sm text-muted-foreground">Tools</span>
          </span>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-highlight"
            aria-hidden
          />
        </Link>
        <Link
          href="#categories"
          className="flex min-w-0 items-center justify-between gap-2 px-4 py-3 hover:bg-accent sm:px-8"
        >
          <span className="min-w-0">
            <strong className="block text-lg tabular-nums">
              {categoryCount}
            </strong>
            <span className="block text-sm text-muted-foreground">
              Categories
            </span>
          </span>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-highlight"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}
