import { Layers3 } from "lucide-react";

const startEntry = `
  (() => {
    try {
      const key = "toolnest-entry-shown";
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");

      const root = document.documentElement;
      const started = performance.now();
      root.dataset.siteEntry = "loading";

      const dismiss = () => {
        window.removeEventListener("load", dismiss);
        window.clearTimeout(deadline);
        window.setTimeout(() => {
          delete root.dataset.siteEntry;
        }, Math.max(0, 500 - (performance.now() - started)));
      };
      const deadline = window.setTimeout(dismiss, 1050);
      if (document.readyState === "complete") dismiss();
      else window.addEventListener("load", dismiss, { once: true });
    } catch {}
  })();
`;

export function EntryLoaderScript() {
  return <script dangerouslySetInnerHTML={{ __html: startEntry }} />;
}

export function EntryLoader() {
  return (
    <div className="site-entry-loader" aria-hidden="true">
      <div className="site-entry-content">
        <span className="brand-mark site-entry-mark">
          <Layers3 size={38} className="site-entry-icon" />
        </span>
        <span className="text-2xl font-bold tracking-tight">
          ToolNest <span className="text-highlight">Pro</span>
        </span>
      </div>
    </div>
  );
}
