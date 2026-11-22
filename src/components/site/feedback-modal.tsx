"use client";

import { useState } from "react";
import { MessageSquarePlus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"feedback" | "bug" | "suggestion">("feedback");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) {
      toast.error("Please provide at least a few words.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          rating,
          message,
          url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Thank you! Your feedback has been received.");
        setMessage("");
        setOpen(false);
      } else {
        toast.error("Could not submit feedback at this time.");
      }
    } catch {
      toast.error("Could not submit feedback at this time.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-lg hover:bg-accent transition-transform hover:scale-105"
        aria-label="Submit Feedback or Report Issue"
      >
        <MessageSquarePlus className="h-4 w-4 text-highlight" />
        <span>Feedback</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Feedback & Report</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "feedback", label: "Appreciation" },
                      { id: "suggestion", label: "Suggestion" },
                      { id: "bug", label: "Bug Report" },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        type === cat.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-accent/50 text-foreground hover:bg-accent"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  How would you rate your experience?
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Your comments or bug details
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you like or what could be improved..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Sending..." : "Submit Feedback"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
