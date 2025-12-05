import { useEffect, useState, useRef } from 'react';
import { Folder, File, Plus, Check, Upload, Download } from 'lucide-react';
import { filesystemRPCClient } from '../rpc.ts';

interface FilesBrowserProps {
  agentId: string;
  onClose: () => void;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return <File size={16} />;
};

export default function FilesBrowser({ agentId, onClose }: FilesBrowserProps) {
  const [currentPath, setCurrentPath] = useState('.');
  const [files, setFiles] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDirectory(currentPath);
    loadSelectedFiles();
  }, [currentPath]);

  const loadSelectedFiles = async () => {
    try {
      const result = await filesystemRPCClient.getSelectedFiles({ agentId });
      setSelectedFiles(new Set(result.files));
    } catch (error) {
      console.error('Failed to load selected files:', error);
    }
  };

  const loadDirectory = async (path: string) => {
    try {
      const result = await filesystemRPCClient.listDirectory({ path, recursive: false });
      // Files are returned as relative paths from the directory, not full paths
      setFiles(result.files);
    } catch (error) {
      console.error('Failed to load directory:', error);
    }
  };

  const handleFileClick = async (file: string) => {
    const isDir = file.endsWith('/');
    const cleanFile = isDir ? file.slice(0, -1) : file;
    // file is already the full relative path from listDirectory
    const fullPath = cleanFile;
    try {
      const stat = await filesystemRPCClient.stat({ path: fullPath });
      const stats = JSON.parse(stat.stats);
      
      if (stats.isDirectory) {
        setCurrentPath(fullPath);
        setFileContent(null);
        setSelectedFile(null);
      } else {
        const result = await filesystemRPCClient.readFile({ path: fullPath, encoding: 'utf8' });
        setFileContent(result.content);
        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  const handleAddFile = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanFile = file.endsWith('/') ? file.slice(0, -1) : file;
    // file is already the full relative path from listDirectory
    const fullPath = cleanFile;
    try {
      await filesystemRPCClient.addFileToChat({ agentId, file: fullPath });
      setSelectedFiles(prev => new Set([...prev, fullPath]));
    } catch (error) {
      console.error('Failed to add file:', error);
    }
  };

  const handleDownload = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanFile = file.endsWith('/') ? file.slice(0, -1) : file;
    try {
      const result = await filesystemRPCClient.readFile({ path: cleanFile, encoding: 'utf8' });
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
    if (currentPath === '.') return;
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length === 1) {
      setCurrentPath('.');
    } else {
      setCurrentPath(parts.slice(0, -1).join('/'));
    }
    setFileContent(null);
    setSelectedFile(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const targetPath = currentPath === '.' ? file.name : `${currentPath}/${file.name}`;
        await filesystemRPCClient.writeFile({ path: targetPath, content });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
    
    await loadDirectory(currentPath);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between bg-secondary border-b border-default p-4">
          <h2 className="text-accent text-lg font-bold">Files</h2>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary border-none rounded-sm text-white cursor-pointer text-xs py-1.5 px-3 hover:btn-primary flex items-center gap-1">
            <Upload size={14} /> Upload
          </button>
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
            <div className="p-2 border-b border-default text-info text-sm">{currentPath === '.' ? '/' : currentPath}</div>
            {currentPath !== '.' && (
              <div onClick={goUp} className="p-2 text-warning cursor-pointer hover:bg-tertiary text-sm">.. (parent)</div>
            )}
            {files.map((file, i) => {
              const isDir = file.endsWith('/');
              const cleanFile = isDir ? file.slice(0, -1) : file;
              const isSelected = selectedFiles.has(cleanFile);
              return (
                <div
                  key={i}
                  onClick={() => handleFileClick(file)}
                  className={`p-2 cursor-pointer hover:bg-tertiary text-sm flex items-center justify-between ${selectedFile === file ? 'bg-active' : ''} ${isDir ? 'text-warning' : 'text-primary'}`}
                >
                  <div className="flex items-center gap-2">
                    {isDir ? <Folder size={16} /> : <File size={16} />}
                    <span>{file}</span>
                  </div>
                  {!isDir && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleDownload(file, e)}
                        className="p-1 hover:bg-hover rounded"
                        title="Download file"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => handleAddFile(file, e)}
                        className="p-1 hover:bg-hover rounded"
                        title={isSelected ? "Already in chat" : "Add to chat"}
                      >
                        {isSelected ? <Check size={14} className="text-accent" /> : <Plus size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {fileContent ? (
              <pre className="text-primary text-sm whitespace-pre-wrap break-words">{fileContent}</pre>
            ) : (
              <div className="text-muted text-sm">Select a file to view its contents</div>
            )}
          </div>
        </div>
    </div>
  );
}
