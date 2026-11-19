import { matchRegex } from "./regex-engine";

self.onmessage = ({
  data,
}: MessageEvent<{ pattern: string; text: string; flags: string }>) => {
  try {
    self.postMessage({
      output: matchRegex(data.pattern, data.text, data.flags),
    });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Regex evaluation failed.",
    });
  }
};
