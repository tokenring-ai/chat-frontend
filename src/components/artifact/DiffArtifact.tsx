import React from "react";

export default function DiffArtifact({body} : {body: string}) {
  return (
    <pre className="font-mono text-sm whitespace-pre-wrap break-words m-0">
      {body.split('\n').map((line, i) => {
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