import {ChevronDown, ChevronRight, Download} from 'lucide-react';
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

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([body], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ArtifactComponent = artifactComponentMap[mimeType] ?? TextArtifact;
  return (
    <div className="border border-border rounded bg-secondary my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-hover transition-colors text-left cursor-pointer"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium">{name}</span>
        <span className="text-muted text-sm ml-auto">{mimeType}</span>
        <button
          onClick={handleDownload}
          className="p-1 hover:bg-secondary rounded transition-colors text-muted hover:text-foreground"
          title="Download artifact"
        >
          <Download size={16} />
        </button>
      </button>
      {isExpanded && (
        <div className="border-t border-border p-3 overflow-x-auto">
          <ArtifactComponent name={name } mimeType={mimeType} body={body} />
        </div>
      )}
    </div>
  );
}
