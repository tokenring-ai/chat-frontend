import MDEditor from '@uiw/react-md-editor';
import { Save } from 'lucide-react';
import React, { useState } from 'react';
import { filesystemRPCClient } from '../../rpc.ts';

interface FileViewerProps {
  file: string;
  content: string;
  onSave: () => void;
}

export default function MarkdownEditor({ file, content, onSave }: FileViewerProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await filesystemRPCClient.writeFile({path: file, content: editorContent});
      onSave();
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-100">
        <h2 className="text-accent text-md font-bold flex items-center gap-2">
          {file}
        </h2>
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

      <MDEditor className="flex-1 flex flex-row h-full"
        preview="preview"
        value={editorContent}
        onChange={(value) => value ? setEditorContent(value) : null}


      />
    </div>
  );
}