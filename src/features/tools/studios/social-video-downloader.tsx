"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { socialPlatforms, socialPostUrl, type SocialPlatform } from "@/features/social/platforms";
import { Field, Notice, Workspace, useOperation, type StudioProps } from "./shared";

export default function SocialVideoDownloader({ slug }: StudioProps) {
  const platform = slug.replace("-video-downloader", "") as SocialPlatform;
  const { label, help } = socialPlatforms[platform];
  const [url, setUrl] = useState("");
  const result = useOperation<string>(slug);
  const post = socialPostUrl(platform, url);

  return (
    <Workspace
      input={
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (!post) return;
          void result.run(async () => {
            const response = await fetch("/api/social-download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ platform, url: post }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error);
            return body.downloadUrl;
          });
        }}>
          <Field label={`${label} video post URL`}>
            <Input type="url" placeholder="https://…" value={url} maxLength={1000} required
              disabled={result.busy}
              onChange={(event) => {
                setUrl(event.target.value);
                result.clear();
              }} />
          </Field>
          {url && !post && <Notice error>Enter a video post URL from {label}.</Notice>}
          <Button type="submit" disabled={!post || result.busy}>
            {result.busy ? "Finding video…" : "Get download link"}
          </Button>
        </form>
      }
      output={
        <>
          {result.error && <Notice error>{result.error}</Notice>}
          {result.output && (
            <Button asChild>
              <a href={result.output} target="_blank" rel="noopener noreferrer">Download video</a>
            </Button>
          )}
          <p className="text-sm text-muted-foreground">{help}</p>
          {post && (
            <Button asChild variant="outline">
              <a href={post} target="_blank" rel="noopener noreferrer">Open post on {label}</a>
            </Button>
          )}
        </>
      }
    />
  );
}
