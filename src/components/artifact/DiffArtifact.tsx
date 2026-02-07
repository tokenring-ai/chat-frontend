import React from "react";

export default function DiffArtifact({ decodedBody }: { decodedBody: string | Buffer }) {
  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");

  return (
    <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
      {textBody.split('\n').map((line, i) => {
        const className = line.startsWith('+')
          ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
          : line.startsWith('-')
            ? 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30'
            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30';
        return (
          <div key={i} className={`${className} px-1 rounded-sm`}>
            {line}
          </div>
        );
      })}
    </pre>
  );
}
