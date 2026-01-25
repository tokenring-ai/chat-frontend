import { type Artifact } from "@tokenring-ai/agent/AgentEvents";
import {ChevronDown, ChevronRight, Download, FileText, Code, FileJson, Layout} from 'lucide-react';
import React, {Fragment, useMemo, useState} from 'react';
import DiffArtifact from "./artifact/DiffArtifact.tsx";
import MarkdownArtifact from "./artifact/MarkdownArtifact.tsx";
import TextArtifact from "./artifact/TextArtifact.tsx";

    const artifactComponentMap: Record<string, any> = {
      'text/x-diff': DiffArtifact,
      'text/markdown': MarkdownArtifact,
    }

    const getMimeIcon = (mime: string) => {
      if (mime.includes('markdown')) return <FileText size={20} className="text-blue-400" />;
      if (mime.includes('diff')) return <Code size={20} className="text-green-400" />;
      if (mime.includes('json')) return <FileJson size={20} className="text-yellow-400" />;
      return <Layout size={20} className="text-gray-400" />;
    };

    interface ArtifactViewerProps {
      artifact: Artifact;
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
        <div className="group">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden shadow-xl transition-all duration-200 hover:border-[#444] min-w-2xs">
            {/* Header Section */}
            <div 
              className="p-3 flex items-center cursor-pointer hover:bg-[#252525] transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="text-gray-500 transition-transform duration-200">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                
                <div className="p-3 bg-[#2a2a2a] rounded-md">
                  {getMimeIcon(artifact.mimeType)}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-200 truncate">
                    {artifact.name}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {artifact.mimeType}
                  </span>
                </div>
              </div>

              {/* Action Section with spacing */}
              <div className="flex items-center ml-4">
                <button 
                  onClick={handleDownload}
                  title="Download artifact"
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>

            {/* Body Content (Conditional) */}
            {isExpanded && (
              <div className="border-t border-[#333] bg-[#0d0d0d]">
                <div className="max-h-[500px] overflow-auto custom-scrollbar">
                  <div className="p-4 prose-invert">
                    <ArtifactComponent artifact={artifact} decodedBody={decodedBody} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
