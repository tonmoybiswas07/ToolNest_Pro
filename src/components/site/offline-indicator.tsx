"use client";

import { startTransition, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const setOnline = () => setOffline(false);
    const setOff = () => setOffline(true);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOff);
    startTransition(() => setOffline(!navigator.onLine));
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOff);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-lg"
    >
      <WifiOff size={15} aria-hidden />
      Offline — tools still work
    </div>
  );
}
