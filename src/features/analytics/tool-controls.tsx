"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { sendAnalytics } from "./client";

export function ToolControls({ slug, previousSlug }: { slug: string; previousSlug?: string }) {
  const { data: session } = authClient.useSession();
  const [favorite, setFavorite] = useState(false);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (opened.current === slug || typeof crypto.randomUUID !== "function") return;
    opened.current = slug;
    const id = crypto.randomUUID();
    let attribution: string | null = null;
    try {
      attribution = sessionStorage.getItem("toolnest-search");
      sessionStorage.removeItem("toolnest-search");
    } catch {}
    const searchId = attribution?.split(":")[0];
    if (searchId) sendAnalytics({ type: "opened", slug, id, searchId }).catch(() => {});
    else sendAnalytics({ type: "opened", slug, id }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!session?.user.id) return;
    let current = true;
    fetch("/api/analytics/preferences").then(response => response.ok ? response.json() : null).then(data => {
      if (current && data) {
        setFavorite(data.favorites.includes(slug) || (previousSlug ? data.favorites.includes(previousSlug) : false));
        setLoaded(true);
      }
    }).catch(() => {});
    return () => { current = false; };
  }, [session?.user.id, slug, previousSlug]);

  async function toggle() {
    setPending(true);
    try {
      if (!(await sendAnalytics({ type: "favorite", slug, enabled: !favorite })).ok) throw new Error();
      setFavorite(!favorite);
    } catch {
      toast.error("Could not update favorites.");
    } finally {
      setPending(false);
    }
  }

  if (!session) return <Button variant="ghost" asChild><Link href="/login">Sign in to save favorites</Link></Button>;
  return <Button variant="outline" aria-pressed={favorite} disabled={pending || !loaded} onClick={toggle}><Heart size={16} fill={favorite ? "currentColor" : "none"} />{favorite ? "Remove favorite" : "Save to favorites"}</Button>;
}
