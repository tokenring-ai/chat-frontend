import React from "react";

export default function DiffArtifact({decodedBody} : {decodedBody: string | Buffer}) {
  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");
  return (
    <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0">
      {textBody.split('\n').map((line, i) => {
        const className = line.startsWith('+')
          ? 'bg-green-900/30 text-green-400'
          : line.startsWith('-')
            ? 'bg-red-900/30 text-red-400'
            : '';
        return (
          <div key={i} className={className}>
            {line}
          </div>
        );
      })}
    </pre>
  );
}
