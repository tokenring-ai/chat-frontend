import React from "react";

export default function TextArtifact({decodedBody}: { decodedBody: string | Buffer }) {
  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");

  return (
    <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0">
      {textBody}
    </pre>
  );
}
