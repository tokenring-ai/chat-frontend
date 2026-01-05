import {ChevronDown, ChevronRight} from 'lucide-react';
import React, {useState} from 'react';
import DiffArtifact from "./artifact/DiffArtifact.tsx";
import MarkdownArtifact from "./artifact/MarkdownArtifact.tsx";
import TextArtifact from "./artifact/TextArtifact.tsx";

const artifactComponentMap: Record<string, any> = {
  'text/x-diff': DiffArtifact,
  'text/markdown': MarkdownArtifact,
}

interface ArtifactViewerProps {
  name: string;
  mimeType: string;
  body: string;
}

export default function ArtifactViewer({ name, mimeType, body }: ArtifactViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const ArtifactComponent = artifactComponentMap[mimeType] ?? TextArtifact;
  return (
    <div className="border border-border rounded bg-secondary my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-hover transition-colors text-left"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium">{name}</span>
        <span className="text-muted text-sm ml-auto">{mimeType}</span>
      </button>
      {isExpanded && (
        <div className="border-t border-border p-3 overflow-x-auto">
          <ArtifactComponent name={name } mimeType={mimeType} body={body} />
        </div>
      )}
    </div>
  );
}
