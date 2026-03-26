import Editor from '@monaco-editor/react';
import React, {useState} from 'react';
import {useTheme} from "../../hooks/useTheme.ts";

interface FileViewerProps {
  file: string;
  content: string;
  onContentChange?: (content: string) => void;
  onMarkSaved?: () => void;
}

type MonacoEditorInstance = Parameters<NonNullable<React.ComponentProps<typeof Editor>['onMount']>>[0];

export default function CodeEditor({file, content, onContentChange, onMarkSaved}: FileViewerProps) {
  const handleMarkSaved = () => {
    setIsModified(false);
    onMarkSaved?.();
  };
  const [editorContent, setEditorContent] = useState(content);
  const [isModified, setIsModified] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({line: 1, column: 1});

  const handleContentChange = (value: string | undefined) => {
    const newContent = value || '';
    setEditorContent(newContent);
    setIsModified(newContent !== content);
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

  const getLineCount = (text: string) => {
    return text.length > 0 ? text.split('\n').length : 1;
  };

  const getWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  const [theme] = useTheme();
  const language = getLanguage(file);
  const lineCount = getLineCount(editorContent);
  const wordCount = getWordCount(editorContent);

  const handleEditorMount = (editor: MonacoEditorInstance) => {
    const updateCursorPosition = () => {
      const position = editor.getPosition();
      if (position) {
        setCursorPosition({
          line: position.lineNumber,
          column: position.column
        });
      }
    };

    editor.onDidChangeCursorPosition(updateCursorPosition);
    updateCursorPosition();
  };

  return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={editorContent}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            theme={theme === "light" ? "vs-light" : "vs-dark"}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
        <div className={`flex items-center justify-between px-3 py-1 text-xs border-t ${
          theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
        }`}>
          <div className="flex items-center gap-4">
            <span className="font-medium truncate max-w-[200px]" title={file}>
              {file}
            </span>
            {isModified && (
              <span className={`px-2 py-0.5 rounded text-xs ${
                theme === 'light' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-900 text-yellow-200'
              }`}>
                Modified
              </span>
            )}
            {!isModified && (
              <span className="flex items-center gap-1 text-green-500" title="Saved">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>{language}</span>
            <span>{lineCount} lines</span>
            <span>{wordCount} words</span>
            <span title="Cursor position">Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            <button
              onClick={handleMarkSaved}
              disabled={!isModified}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                isModified
                  ? theme === 'light'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-blue-900 text-blue-200 hover:bg-blue-800'
                  : 'opacity-30 cursor-not-allowed'
              }`}
              title="Mark as saved"
            >
              Mark Saved
            </button>
          </div>
        </div>
      </div>
  );
}
