import MDEditor from '@uiw/react-md-editor';
import React, { useState } from 'react';

interface FileViewerProps {
  content: string;
  onContentChange?: (content: string) => void;
}

export default function MarkdownEditor({content,onContentChange }: FileViewerProps) {
  const [editorContent, setEditorContent] = useState(content);

  const handleContentChange = (value?: string) => {
    if (value) {
      setEditorContent(value);
      onContentChange?.(value);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <MDEditor className="flex-1 flex flex-row h-full"
        preview="preview"
        value={editorContent}
        onChange={handleContentChange}


      />
    </div>
  );
}