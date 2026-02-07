import React from "react";

export default function TextArtifact({ decodedBody }: { decodedBody: string | Buffer }) {
  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");

  return (
    <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/50 text-zinc-800 dark:text-zinc-300">
      {textBody}
    </pre>
  );
}
