import React from "react";

export default function TextArtifact({body}: { body: string }) {
  return (
    <pre className="font-mono text-sm whitespace-pre-wrap break-words m-0">
      {body}
    </pre>
  );
}