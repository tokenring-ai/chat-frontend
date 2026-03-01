import React, { useMemo } from 'react';
import { Download, File, FileCode, FileJson, Image as ImageIcon, FileText, X } from 'lucide-react';
import type { InputAttachment } from '@tokenring-ai/agent/AgentEvents';

interface AttachmentChipProps {
  attachment: InputAttachment;
  onRemove?: () => void;
  showRemove?: boolean;
}

/**
 * Gets the appropriate icon based on the attachment's MIME type
 */
function getAttachmentIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon className="w-4 h-4" />;
  }
  if (mimeType.includes('json')) {
    return <FileJson className="w-4 h-4" />;
  }
  if (mimeType.includes('text') || mimeType.includes('markdown') || mimeType.includes('plain')) {
    return <FileText className="w-4 h-4" />;
  }
  if (
    mimeType.includes('code') || 
    mimeType.includes('script') || 
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    mimeType.includes('python') ||
    mimeType.includes('java') ||
    mimeType.includes('c++') ||
    mimeType.includes('c#')
  ) {
    return <FileCode className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
}

/**
 * Downloads the attachment as a file
 */
function downloadAttachment(attachment: InputAttachment) {
  try {
    let blob: Blob;
    
    if (attachment.encoding === 'base64') {
      // Decode base64 and create blob
      const binaryString = atob(attachment.body);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: attachment.mimeType || 'application/octet-stream' });
    } else {
      // Plain text or href
      blob = new Blob([attachment.body], { type: attachment.mimeType || 'text/plain' });
    }
    
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL object after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to download attachment:', error);
  }
}

/**
 * Gets a preview of the attachment content (first 100 chars)
 */
function getAttachmentPreview(attachment: InputAttachment): string {
  try {
    let textBody: string;
    
    if (attachment.encoding === 'base64') {
      textBody = atob(attachment.body);
    } else {
      textBody = attachment.body;
    }
    
    // For text-based attachments, show a preview
    if (attachment.mimeType.startsWith('text/') || 
        attachment.mimeType.includes('json') || 
        attachment.mimeType.includes('markdown')) {
      return textBody.substring(0, 100) + (textBody.length > 100 ? '...' : '');
    }
  } catch {
    // Ignore errors when getting preview
  }
  return '';
}

export default function AttachmentChip({ attachment, onRemove, showRemove = false }: AttachmentChipProps) {
  const icon = getAttachmentIcon(attachment.mimeType);
  const preview = getAttachmentPreview(attachment);
  const hasPreview = preview.length > 0;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadAttachment(attachment);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div 
      className="group flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-primary/20 hover:border-primary/40 transition-all"
      role="listitem"
      aria-label={`Attachment: ${attachment.name}`}
    >
      {/* Icon */}
      <div className="shrink-0 text-muted">
        {icon}
      </div>
      
      {/* File info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span 
            className="text-sm font-medium text-primary truncate"
            title={attachment.name}
          >
            {attachment.name}
          </span>
          {hasPreview && (
            <span className="text-xs text-dim truncate max-w-[150px] hidden sm:inline">
              {preview}
            </span>
          )}
        </div>
        {/* MIME type and size info on hover */}
        <div className="text-xs text-dim opacity-0 group-hover:opacity-100 transition-opacity font-mono">
          {attachment.mimeType}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Download button */}
        <button
          onClick={handleDownload}
          className="cursor-pointer p-1.5 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors focus-ring"
          title={`Download ${attachment.name}`}
          aria-label={`Download ${attachment.name}`}
        >
          <Download className="w-4 h-4" />
        </button>
        
        {/* Remove button (optional, for input area attachments) */}
        {showRemove && onRemove && (
          <button
            onClick={handleRemove}
            className="cursor-pointer p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors focus-ring"
            title={`Remove ${attachment.name}`}
            aria-label={`Remove ${attachment.name}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
