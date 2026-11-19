"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const { error } = await authClient.signOut();
      if (!error) {
        window.location.replace("/login");
        return;
      }
    } catch {
      toast.error("Couldn’t reach ToolNest Pro. Try signing out again.");
      setPending(false);
      return;
    }

    toast.error("Couldn’t sign out. Try again shortly.");
    setPending(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={logout}
    >
      {pending ? (
        <LoaderCircle
          size={16}
          className="motion-safe:animate-spin"
          aria-hidden
        />
      ) : (
        <LogOut size={16} aria-hidden />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
