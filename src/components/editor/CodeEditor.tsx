import Editor from '@monaco-editor/react';
import {Save} from 'lucide-react';
import React, {useState} from 'react';
import {useTheme} from "../../hooks/useTheme.ts";
import {filesystemRPCClient} from '../../rpc.ts';

interface FileViewerProps {
  file: string;
  content: string;
  onContentChange?: (content: string) => void;
}

export default function CodeEditor({ file, content, onContentChange }: FileViewerProps) {
  const [editorContent, setEditorContent] = useState(content);

  const handleContentChange = (value: string | undefined) => {
    const newContent = value || '';
    setEditorContent(newContent);
    onContentChange?.(newContent);
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
      go: 'go', rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift',
      kt: 'kotlin', scala: 'scala', sql: 'sql', sh: 'shell', bash: 'shell',
      json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', md: 'markdown',
      html: 'html', css: 'css', scss: 'scss', less: 'less',
    };
    return langMap[ext || ''] || 'plaintext';
  };


  const [theme] = useTheme();

  return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={getLanguage(file)}
            value={editorContent}
            onChange={handleContentChange}
            theme={ theme === "light" ? "vs-light" : "vs-dark"}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
  );
}
