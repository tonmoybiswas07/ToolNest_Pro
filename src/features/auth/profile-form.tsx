"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { maxProfileImageLength } from "./profile-image";
import { UserAvatar } from "./user-avatar";

async function resizePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a JPEG, PNG, or WebP image under 10 MB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    const side = Math.min(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 192, 192);
    const photo = canvas.toDataURL("image/webp", 0.85);
    return photo.length <= maxProfileImageLength ? photo : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

export function ProfileForm({ name, image }: { name: string; image?: string | null }) {
  const router = useRouter();
  const [draftName, setDraftName] = useState(name);
  const [photo, setPhoto] = useState<string | null | undefined>();
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function selectPhoto(file?: File) {
    if (!file) return;
    setReading(true);
    setStatus("");
    setError("");
    try {
      setPhoto(await resizePhoto(file));
    } catch (problem) {
      setError(problem instanceof Error && problem.name === "Error" ? problem.message : "Could not read this image.");
    } finally {
      setReading(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draftName.trim();
    setStatus("");
    if (!nextName) {
      setError("Enter your name.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const { error } = await authClient.updateUser({ name: nextName, ...(photo !== undefined && { image: photo }) });
      if (error) {
        setError(error.message ?? "Could not save your profile.");
        return;
      }
      setDraftName(nextName);
      setStatus("Profile saved.");
      router.refresh();
    } catch {
      setError("Could not save your profile. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const preview = photo === undefined ? image : photo;
  return (
    <section className="surface mt-5 p-5 sm:p-8" aria-labelledby="edit-profile-heading">
      <h2 id="edit-profile-heading" className="text-xl font-semibold">Edit profile</h2>
      <form method="post" onSubmit={save} className="mt-4">
        <fieldset disabled={reading || pending} className="grid max-w-md gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Full name
            <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} autoComplete="name" maxLength={100} required />
          </label>
          <div className="flex flex-wrap items-end gap-4">
            <UserAvatar name={draftName} image={preview} large />
            <label className="grid gap-2 text-sm font-medium">
              Profile photo
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                void selectPhoto(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{pending ? "Saving…" : "Save profile"}</Button>
            {preview && <Button type="button" variant="outline" onClick={() => { setPhoto(null); setStatus(""); }}>Remove photo</Button>}
          </div>
        </fieldset>
        {reading && <p role="status" className="mt-3 text-sm">Preparing photo…</p>}
        {status && <p role="status" className="mt-3 text-sm">{status}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </form>
    </section>
  );
}
