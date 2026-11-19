"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inspectJwt, jsonText } from "./data-engines";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  type StudioProps,
  TextArea,
  useOperation,
  Workspace,
} from "./shared";

export default function JwtInspector({ slug }: StudioProps) {
  const [token, setToken] = useState("");
  const { output, error, run, clear } =
    useOperation<ReturnType<typeof inspectJwt>>(slug);
  return (
    <Workspace
      input={
        <>
          <Notice>
            Avoid pasting production tokens. Decoding happens in this browser.
            The signature is unverified and all decoded claims are untrusted.
          </Notice>
          <Field label="Compact JWT">
            <TextArea
              autoComplete="off"
              value={token}
              maxLength={65536}
              onChange={(event) => {
                setToken(event.target.value);
                clear();
              }}
              className="font-mono"
            />
          </Field>
          <Actions>
            <Button
              type="button"
              onClick={() => void run(() => inspectJwt(token))}
            >
              Decode JWT
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setToken("");
                clear();
              }}
            >
              Reset
            </Button>
          </Actions>
        </>
      }
      output={
        <>
          {error && <Notice error>{error}</Notice>}
          {output ? (
            <>
              <Notice>{output.status}. Signature unverified.</Notice>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-semibold">Issued at (UTC)</dt>
                  <dd>
                    {output.issued?.toISOString() ?? "Missing or invalid"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Expires (UTC)</dt>
                  <dd>
                    {output.expiration?.toISOString() ?? "Missing or invalid"}
                  </dd>
                </div>
              </dl>
              <h3 className="text-sm font-semibold">Header</h3>
              <CodeBlock>{jsonText(output.header, 2)}</CodeBlock>
              <h3 className="text-sm font-semibold">Claims</h3>
              <CodeBlock>{jsonText(output.payload, 2)}</CodeBlock>
              <ExportActions
                value={jsonText(output.payload, 2)}
                label="Copy decoded claims"
              />
            </>
          ) : (
            !error && (
              <Notice>Decoded header and claims will appear here.</Notice>
            )
          )}
        </>
      }
    />
  );
}
