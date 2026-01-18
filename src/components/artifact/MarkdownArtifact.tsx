import {type Artifact} from "@tokenring-ai/agent/AgentEvents";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownArtifactProps {
  artifact: Artifact;
  decodedBody: string | Buffer;
}

export default function MarkdownArtifact({ artifact, decodedBody }: MarkdownArtifactProps) {
  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {textBody}
      </ReactMarkdown>
    </div>
  );
}
