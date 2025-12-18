import Editor from '@monaco-editor/react';
import {Save} from 'lucide-react';
import React, {useState} from 'react';
import {useTheme} from "../../hooks/useTheme.ts";
import {filesystemRPCClient} from '../../rpc.ts';

interface FileViewerProps {
  file: string;
  content: string;
  onSave: () => void;
}

export default function CodeEditor({ file, content, onSave }: FileViewerProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await filesystemRPCClient.writeFile({ path: file, content: editorContent });
      onSave();
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setSaving(false);
    }
  };

  const [theme] = useTheme();

  return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-accent text-md font-bold">{file}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || editorContent === content}
              className={`border-none rounded-sm text-xs py-1.5 px-3 flex items-center gap-1 ${
                editorContent === content
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'btn-primary text-white cursor-pointer hover:btn-primary'
              }`}
            >
              <Save size={14}/> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={getLanguage(file)}
            value={editorContent}
            onChange={(value) => setEditorContent(value || '')}
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
