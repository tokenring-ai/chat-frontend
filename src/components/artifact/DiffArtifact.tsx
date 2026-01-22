import React from "react";

export default function DiffArtifact({ decodedBody }: { decodedBody: string | Buffer }) {
  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");

  return (
    <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
      {textBody.split('\n').map((line, i) => {
        const className = line.startsWith('+')
          ? 'text-green-400 bg-green-900/20'
          : line.startsWith('-')
            ? 'text-red-400 bg-red-900/20'
            : 'text-zinc-300 hover:bg-zinc-800/30';
        return (
          <div key={i} className={className}>
            {line}
          </div>
        );
      })}
    </pre>
  );
}
