import {Download, Eye, EyeOff, File, Folder, Plus, Upload, X, ArrowLeft } from 'lucide-react';
import React, {useRef, useState} from 'react';
import MarkdownEditor from "../../components/editor/MarkdownEditor.tsx";
import {filesystemRPCClient, useDirectoryListing, useFileContents, useSelectedFiles} from '../../rpc.ts';
import CodeEditor from '../../components/editor/CodeEditor.tsx';

interface FilesBrowserProps {
  agentId: string;
  onClose: () => void;
}

export default function FileBrowser({ agentId, onClose }: FilesBrowserProps) {
  const [path, setPath] = useState('.');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const directoryListing = useDirectoryListing({ path, showHidden: showHiddenFiles, agentId });
  const selectedFiles = useSelectedFiles(agentId);
  const fileContent = useFileContents(selectedFile, agentId);

  const handleFileClick = async (file: string) => {
    const isDir = file.endsWith('/');
    const fullPath = isDir ? file.slice(0, -1) : file;
    try {
      const stat = await filesystemRPCClient.stat({ path: fullPath, agentId });
      const stats = JSON.parse(stat.stats);
      
      if (stats.isDirectory) {
        setPath(fullPath);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  const handleAddFile = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await filesystemRPCClient.addFileToChat({ agentId, file });
      await selectedFiles.mutate();
    } catch (error) {
      console.error('Failed to add file:', error);
    }
  };

  const handleRemoveFile = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await filesystemRPCClient.removeFileFromChat({ agentId, file });
      await selectedFiles.mutate();
    } catch (error) {
      console.error('Failed to remove file:', error);
    }
  }

  const handleDownload = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanFile = file.endsWith('/') ? file.slice(0, -1) : file;
    try {
      const result = await filesystemRPCClient.readFile({ path: cleanFile, agentId });
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cleanFile.split('/').pop() || 'download';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const goUp = () => {
    if (path === '.') return;
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 1) {
      setPath('.');
    } else {
      setPath(parts.slice(0, -1).join('/'));
    }
    setSelectedFile(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const targetPath = path === '.' ? file.name : `${path}/${file.name}`;
        await filesystemRPCClient.writeFile({ path: targetPath, content, agentId });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await directoryListing.mutate();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between bg-secondary border-b border-default h-14 px-3 sm:px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-hover rounded-md text-primary sm:hidden"
            aria-label="Back to chat"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-accent text-base sm:text-lg font-bold">Files</h2>
        </div>
        
        <div className="flex gap-1.5">
          <button 
            onClick={() => setShowHiddenFiles(!showHiddenFiles)} 
            className="p-2 hover:bg-hover rounded-md text-primary flex items-center gap-1.5"
            title={showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
          >
            {showHiddenFiles ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className="hidden sm:inline text-xs font-medium">{showHiddenFiles ? 'Hide' : 'Show'} Hidden</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2 hover:bg-hover rounded-md text-primary flex items-center gap-1.5"
            title="Upload files"
          >
            <Upload size={18} />
            <span className="hidden sm:inline text-xs font-medium">Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
        {/* File Explorer Pane */}
        <div className={`
          flex flex-col border-default
          ${selectedFile ? 'hidden sm:flex' : 'flex'} 
          sm:w-1/3 sm:border-r h-full overflow-hidden
        `}>
          <div className="p-3 bg-tertiary/30 border-b border-default flex items-center justify-between">
            <span className="text-info text-xs font-mono truncate">{path === '.' ? '/' : path}</span>
            {path !== '.' && (
              <button 
                onClick={goUp} 
                className="text-warning text-xs font-bold hover:underline"
              >
                GO UP
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {directoryListing.data?.files.map((file, i) => {
              const isDir = file.endsWith('/');
              const selectedCount = selectedFiles.data?.files.filter(p => p.startsWith(file)).length ?? 0;
              const isExactSelection = selectedFiles.data?.files.includes(file);
              
              return (
                <div
                  key={i}
                  onClick={() => handleFileClick(file)}
                  className={`
                    group px-3 py-2.5 cursor-pointer border-b border-default/50 flex items-center justify-between transition-colors
                    ${selectedFile === file ? 'bg-active' : 'hover:bg-hover'} 
                    ${isDir ? 'text-warning' : 'text-primary'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isDir ? <Folder size={18} /> : <File size={18} />}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate font-medium">{file}</span>
                      {selectedCount > 0 && (
                        <span className="text-[10px] text-accent font-bold">
                          {isExactSelection ? 'SELECTED' : `${selectedCount} IN CHAT`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isDir && (
                      <button
                        onClick={(e) => handleDownload(file, e)}
                        className="p-1.5 hover:bg-active rounded text-secondary hover:text-primary"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => isExactSelection ? handleRemoveFile(file, e) : handleAddFile(file, e)}
                      className="p-1.5 hover:bg-active rounded"
                      title={isExactSelection ? "Remove from chat" : "Add to chat"}
                    >
                      {isExactSelection ? <X size={14} className="text-error" /> : <Plus size={14} className="text-accent" />}
                    </button>
                  </div>
                </div>
              );
            })}
            {(!directoryListing.data || directoryListing.data.files.length === 0) && (
              <div className="p-8 text-center text-muted text-sm">
                No files found in this directory.
              </div>
            )}
          </div>
        </div>

        {/* File Preview/Editor Pane */}
        <div className={`
          flex-1 flex flex-col overflow-hidden bg-primary
          ${selectedFile ? 'flex' : 'hidden sm:flex'}
        `}>
          {selectedFile && (
            <div className="sm:hidden p-2 bg-secondary border-b border-default flex items-center">
              <button 
                onClick={() => setSelectedFile(null)}
                className="flex items-center gap-1 text-xs font-bold text-info"
              >
                <ArrowLeft size={14} /> BACK TO LIST
              </button>
            </div>
          )}
          
          <div className="flex-1 overflow-auto">
            {selectedFile && fileContent.data ? (
              selectedFile.endsWith('.md') ? (
                <MarkdownEditor 
                  file={selectedFile} 
                  content={fileContent.data.content} 
                  onSave={() => fileContent.mutate()} 
                  agentId={agentId}
                />
              ) : (
                <CodeEditor 
                  file={selectedFile} 
                  content={fileContent.data.content} 
                  onSave={() => fileContent.mutate()} 
                  agentId={agentId}
                />
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted p-6 text-center">
                <File size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Select a file from the explorer to view or edit its contents.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
