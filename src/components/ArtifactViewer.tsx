import {OutputArtifactSchema} from "@tokenring-ai/agent/AgentEvents";
import {ChevronDown, ChevronRight, Download} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import {z} from "zod";
import DiffArtifact from "./artifact/DiffArtifact.tsx";
import MarkdownArtifact from "./artifact/MarkdownArtifact.tsx";
import TextArtifact from "./artifact/TextArtifact.tsx";

const artifactComponentMap: Record<string, any> = {
  'text/x-diff': DiffArtifact,
  'text/markdown': MarkdownArtifact,
}

interface ArtifactViewerProps {
  artifact: z.output<typeof OutputArtifactSchema>;
}

export default function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const decodedBody = useMemo(() => {
    if (artifact.encoding === 'base64') return Buffer.from(artifact.body, 'base64');
    return artifact.body;
  }, [artifact]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([decodedBody], { type: artifact.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.name;
    a.click();
    URL.revokeObjectURL(url);
  };


  const ArtifactComponent = artifactComponentMap[artifact.mimeType] ?? TextArtifact;
  return (
    <div className="border border-primary rounded-xl bg-artifact my-2 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-hover transition-colors text-left cursor-pointer"
      >
        {isExpanded ? <ChevronDown size={18} className="text-accent" /> : <ChevronRight size={18} className="text-accent" />}
        <span className="font-semibold text-primary">{artifact.name}</span>
        <span className="text-tertiary text-xs ml-auto">{artifact.mimeType}</span>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-tertiary rounded-lg transition-colors text-secondary hover:text-primary"
          title="Download artifact"
        >
          <Download size={16} />
        </button>
      </button>
      {isExpanded && (
        <div className="border-t border-primary p-4 overflow-x-auto bg-code">
          <ArtifactComponent artifact={artifact} decodedBody={decodedBody} />
        </div>
      )}
    </div>
  );
}
