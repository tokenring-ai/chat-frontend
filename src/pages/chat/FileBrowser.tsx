import {Check, Download, Eye, EyeOff, File, Folder, Plus, Upload} from 'lucide-react';
import React, {useRef, useState} from 'react';
import {filesystemRPCClient, useDirectoryListing, useFileContents, useSelectedFiles} from '../../rpc.ts';

interface FilesBrowserProps {
  agentId: string;
  onClose: () => void;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return <File size={16} />;
};

export default function FileBrowser({ agentId, onClose }: FilesBrowserProps) {
  const [path, setPath] = useState('.');
  const [showHidden, setShowHidden] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const directoryListing = useDirectoryListing({ path, showHidden });
  const selectedFiles = useSelectedFiles(agentId);
  const fileContent = useFileContents(selectedFile);

  const handleFileClick = async (file: string) => {
    const isDir = file.endsWith('/');
    const fullPath = isDir ? file.slice(0, -1) : file;
    try {
      const stat = await filesystemRPCClient.stat({ path: fullPath });
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
      const result = await filesystemRPCClient.readFile({ path: cleanFile });
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
        await filesystemRPCClient.writeFile({ path: targetPath, content });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await directoryListing.mutate();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between bg-secondary border-b border-default p-4">
          <h2 className="text-accent text-lg font-bold">Files</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowHidden(!showHidden)} className="btn-primary border-none rounded-sm text-white cursor-pointer text-xs py-1.5 px-3 hover:btn-primary flex items-center gap-1" title={showHidden ? "Hide hidden files" : "Show hidden files"}>
              {showHidden ? <EyeOff size={14} /> : <Eye size={14} />} {showHidden ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary border-none rounded-sm text-white cursor-pointer text-xs py-1.5 px-3 hover:btn-primary flex items-center gap-1">
              <Upload size={14} /> Upload
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
        <div className="flex flex-1 overflow-hidden bg-primary">
          <div className="w-1/3 border-r border-default overflow-y-auto">
            <div className="p-2 border-b border-default text-info text-sm">{path === '.' ? '/' : path}</div>
            {path !== '.' && (
              <div onClick={goUp} className="p-2 text-warning cursor-pointer hover:bg-tertiary text-sm">.. (parent)</div>
            )}
            {directoryListing.data?.files.map((file, i) => {
              const isDir = file.endsWith('/');
              const selectedCount = selectedFiles.data?.files.filter(path => path.startsWith(file)).length ?? 0;
              const isExactSelection = selectedFiles.data?.files.includes(file);
              return (
                <div
                  key={i}
                  onClick={() => handleFileClick(file)}
                  className={`p-2 cursor-pointer hover:bg-tertiary text-sm flex items-center justify-between ${selectedFile === file ? 'bg-active' : ''} ${isDir ? 'text-warning' : 'text-primary'}`}
                >
                  { isDir
                    ? <div className={`flex items-center gap-2 ${selectedCount > 0 ? 'text-accent' : ''}`}>
                        <Folder size={16} />
                        <span>{file}{
                          isExactSelection
                            ? ' (Directory selected)'
                            : selectedCount > 0
                              ? ` (${selectedCount} selected)`
                              : ''
                        }</span>
                      </div>
                    : <div className={`flex items-center gap-2 ${selectedCount > 0 ? 'text-accent' : ''}`}>
                        <File size={16} />
                        <span>{file}</span>
                      </div>
                  }
                    <div className="flex gap-1">
                      {!isDir &&
                        <button
                          onClick={(e) => handleDownload(file, e)}
                          className="p-1 hover:bg-hover rounded"
                          title="Download file"
                        >
                          <Download size={14} />
                        </button>
                      }
                      <button
                        onClick={(e) => isExactSelection ? handleRemoveFile(file, e) : handleAddFile(file, e)}
                        className="p-1 hover:bg-hover rounded"
                        title={selectedCount > 0 ? "Remove from chat" : "Add to chat"}
                      >
                        {selectedCount > 0 ? <Check size={14} className="text-accent" /> : <Plus size={14} />}
                      </button>
                    </div>
                </div>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {fileContent.data ? (
              <pre className="text-primary text-sm whitespace-pre-wrap break-words">{fileContent.data.content}</pre>
            ) : (
              <div className="text-muted text-sm">Select a file to view its contents</div>
            )}
          </div>
        </div>
    </div>
  );
}
