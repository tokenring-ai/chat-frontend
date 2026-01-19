import React, { useState, useMemo, useRef } from 'react';
import {
  Folder,
  FileText,
  Search,
  X,
  Server,
  Cloud,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Code,
  List,
  LayoutGrid,
  Image as ImageIcon,
  Check,
  Plus,
  Download,
  Edit,
  File,
  Eye,
  EyeOff,
  Trash2, Save
} from 'lucide-react';
import MarkdownEditor from "../editor/MarkdownEditor.tsx";
import CodeEditor from '../editor/CodeEditor.tsx';
import { filesystemRPCClient, useDirectoryListing, useFileContents, useSelectedFiles } from '../../rpc.ts';
import { cn } from '../../lib/utils.ts';

interface FileBrowserOverlayProps {
    agentId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Helper to extract just the filename from a path
const getBasename = (filePath: string): string => {
    const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
    return cleanPath.split('/').pop() || filePath;
};

// Formatting size
const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function FileBrowserOverlay({ agentId, isOpen, onClose }: FileBrowserOverlayProps) {
    const [path, setPath] = useState('.');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [showHiddenFiles, setShowHiddenFiles] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [previewHeight, setPreviewHeight] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const [editorContent, setEditorContent] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const directoryListing = useDirectoryListing({ path, showHidden: showHiddenFiles, agentId });
    const selectedFiles = useSelectedFiles(agentId);
    const fileContent = useFileContents(selectedFile, agentId);

    // Sort files: directories first, then files, all alphabetically
    const sortedFiles = useMemo(() => {
        if (!directoryListing.data?.files) return [];
        let files = [...directoryListing.data.files];

        if (searchQuery) {
            files = files.filter(f => getBasename(f).toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return files.sort((a, b) => {
            const isDirA = a.endsWith('/');
            const isDirB = b.endsWith('/');
            if (isDirA && !isDirB) return -1;
            if (!isDirA && isDirB) return 1;
            return a.localeCompare(b);
        });
    }, [directoryListing.data?.files, searchQuery]);

    React.useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isResizing]);

    if (!isOpen) return null;

    const handleSaveFile = async () => {
        if (!selectedFile) return;
        setIsSaving(true);
        try {
            await filesystemRPCClient.writeFile({ path: selectedFile, content: editorContent, agentId });
            await fileContent.mutate();
        } catch (error) {
            console.error('Failed to save file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        const container = document.querySelector('.file-browser-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const newHeight = rect.bottom - e.clientY;
        setPreviewHeight(Math.max(200, Math.min(newHeight, rect.height - 200)));
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

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

    const handleGoUp = () => {
        if (path === '.') return;
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 1) {
            setPath('.');
        } else {
            setPath(parts.slice(0, -1).join('/'));
        }
        setSelectedFile(null);
    };

    const handleAddFile = async (file: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await filesystemRPCClient.addFileToChat({ agentId, file });
            await selectedFiles.mutate();
        } catch (error) {
            console.error('Failed to add file:', error);
        }
    };

    const handleRemoveFile = async (file: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await filesystemRPCClient.removeFileFromChat({ agentId, file });
            await selectedFiles.mutate();
        } catch (error) {
            console.error('Failed to remove file:', error);
        }
    }

    const handleDownload = async (file: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const cleanFile = file.endsWith('/') ? file.slice(0, -1) : file;
        try {
            const result = await filesystemRPCClient.readTextFile({ path: cleanFile, agentId });
            const blob = new Blob([result.content ?? ""], { type: 'text/plain' });
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

    const getFileIcon = (file: string, isDir: boolean, size = 16) => {
        if (isDir) return <Folder className="text-indigo-400" size={size} />;
        if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
            return <FileText className="text-cyan-500" size={size} />;
        }
        if (file.endsWith('.json')) return <Code className="text-amber-500" size={size} />;
        if (file.endsWith('.md')) return <FileText className="text-purple-400" size={size} />;
        if (file.match(/\.(png|jpe?g|gif|svg|webp)$/i)) return <ImageIcon className="text-purple-400" size={size} />;
        return <FileText className="text-zinc-400" size={size} />;
    };

    const breadcrumbs = path === '.' ? [] : path.split('/');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="w-full max-w-6xl h-[85vh] bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 relative file-browser-container">

                {/* Window Controls & Header */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/30 shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Folder size={16} />
                            <span className="text-xs font-medium tracking-wide">File Browser</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-8 pr-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 w-48 transition-all"
                            />
                        </div>
                        <button
                            onClick={onClose}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Browser Body */}
                <div className="flex flex-1 min-h-0">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-[#09090b] min-w-0">
                        {/* Breadcrumbs & Toolbar */}
                        <div className="h-10 border-b border-zinc-800 flex  px-4 shrink-0 ">
                            <div className="flex flex-1 items-center gap-1 text-xs text-zinc-500">
                                <span
                                    className="hover:text-zinc-300 cursor-pointer"
                                    onClick={() => setPath('.')}
                                >root</span>
                                {breadcrumbs.map((part, i) => (
                                    <React.Fragment key={i}>
                                        <ChevronRight size={10} />
                                        <span
                                            className="hover:text-zinc-300 cursor-pointer"
                                            onClick={() => setPath(breadcrumbs.slice(0, i + 1).join('/'))}
                                        >{part}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-800/50 text-zinc-400 text-[10px] transition-colors"
                              >
                                {showHiddenFiles ? <EyeOff size={12} /> : <Eye size={12} />}
                                {showHiddenFiles ? 'Hide' : 'Show'} Hidden
                              </button>
                            </div>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-800/50 text-zinc-400 text-[10px] transition-colors"
                            >
                              <Plus size={12} />
                              Upload
                            </button>
                            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
                        </div>

                        {/* File List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] text-zinc-500 font-semibold border-b border-zinc-800/50">
                                        <th className="pl-2 pr-4 py-2 font-medium w-8">
                                            <div className="w-3 h-3 border border-zinc-700 rounded bg-zinc-800/50"></div>
                                        </th>
                                        <th className="px-2 py-2 font-medium">Name</th>
                                        <th className="px-2 py-2 font-medium w-24 hidden sm:table-cell">Size</th>
                                        <th className="px-2 py-2 font-medium w-32 hidden sm:table-cell">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {sortedFiles.map((file, i) => {
                                        const isDir = file.endsWith('/');
                                        const displayName = getBasename(file);
                                        const isSelected = selectedFile === file;
                                        const isInChat = selectedFiles.data?.files.includes(file);

                                        return (
                                            <tr
                                                key={i}
                                                onClick={() => handleFileClick(file)}
                                                className={cn(
                                                    "group transition-colors border-b border-zinc-800/30 cursor-pointer",
                                                    isSelected ? "bg-indigo-500/5" : "hover:bg-zinc-800/30"
                                                )}
                                            >
                                                <td className="pl-2 pr-4 py-2">
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            isInChat ? handleRemoveFile(file) : handleAddFile(file);
                                                        }}
                                                        className={cn(
                                                            "w-3 h-3 border rounded flex items-center justify-center transition-all",
                                                            isInChat
                                                                ? "border-indigo-500 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                                                : "border-zinc-700 hover:border-zinc-500"
                                                        )}
                                                    >
                                                        {isInChat && <Check size={10} className="text-white" />}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <div className={cn(
                                                        "flex items-center gap-2 font-medium",
                                                        isSelected ? "text-indigo-300" : isDir ? "text-zinc-300" : "text-zinc-400"
                                                    )}>
                                                        {getFileIcon(file, isDir)}
                                                        {displayName}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-zinc-500 hidden sm:table-cell">
                                                    {isDir ? '-' : '---'}
                                                </td>
                                                <td className="px-2 py-2 text-zinc-500 hidden sm:table-cell">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isDir && (
                                                            <button
                                                                onClick={(e) => handleDownload(file, e)}
                                                                className="p-1 hover:text-zinc-100"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                isInChat ? handleRemoveFile(file) : handleAddFile(file);
                                                            }}
                                                            className={cn(
                                                                "p-1",
                                                                isInChat ? "text-red-400 hover:text-red-300" : "text-indigo-400 hover:text-indigo-300"
                                                            )}
                                                        >
                                                            {isInChat ? <Trash2 size={14} /> : <Plus size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {sortedFiles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-zinc-600 text-sm">
                                                No files found in this directory.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer selection info */}
                        <div className="h-9 border-t border-zinc-800 bg-zinc-900/20 flex items-center justify-between px-4 shrink-0">
                            <span className="text-[10px] text-zinc-500">
                                {selectedFiles.data?.files.length ?? 0} items in chat
                            </span>
                        </div>
                    </div>

                    {/* Right Sidebar - File Info */}
                    <div className="w-80 bg-zinc-900/10 border-l border-zinc-800 flex flex-col shrink-0 hidden lg:flex">
                        {selectedFile ? (
                            <>
                                <div className="p-4 border-b border-zinc-800/50 flex items-start gap-3">
                                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                        {getFileIcon(selectedFile, false, 24)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-medium text-zinc-200 truncate" title={selectedFile}>{getBasename(selectedFile)}</h3>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">
                                            {selectedFile.split('.').pop()?.toUpperCase()} File
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="p-4 grid grid-cols-2 gap-2 border-b border-zinc-800/50">
                                    <button
                                        onClick={() => selectedFiles.data?.files.includes(selectedFile) ? handleRemoveFile(selectedFile) : handleAddFile(selectedFile)}
                                        className={cn(
                                            "col-span-2 flex items-center justify-center gap-2 text-white text-xs font-medium py-2 rounded-md shadow-lg transition-all active:scale-[0.98]",
                                            selectedFiles.data?.files.includes(selectedFile)
                                                ? "bg-red-600 hover:bg-red-500 shadow-red-500/20"
                                                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                                        )}
                                    >
                                        {selectedFiles.data?.files.includes(selectedFile) ? (
                                            <>
                                                <Trash2 size={16} />
                                                Remove from Chat
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={16} />
                                                Add to Chat
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => handleDownload(selectedFile, e)}
                                        className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-1.5 rounded-md border border-zinc-700 transition-colors"
                                    >
                                        <Download size={14} />
                                        Download
                                    </button>
                                    <button className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-1.5 rounded-md border border-zinc-700 transition-colors">
                                        <Edit size={14} />
                                        Edit
                                    </button>
                                </div>

                                {/* Metadata */}
                                <div className="p-3 text-[10px] text-zinc-500 space-y-1 bg-zinc-900/20">
                                    <div className="flex justify-between">
                                        <span>Path</span>
                                        <span className="text-zinc-400 truncate ml-4" title={selectedFile}>{selectedFile}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Type</span>
                                        <span className="text-zinc-400">{selectedFile.split('.').pop()}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
                                <File size={48} className="mb-4 opacity-10" />
                                <p className="text-xs">Select a file from the explorer to view its contents.</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Bottom Preview Pane */}
                {selectedFile && (
                    <div style={{ height: `${previewHeight}px` }} className="bg-zinc-900/10 border-t border-zinc-800 flex flex-col shrink-0 relative">
                        <div
                            onMouseDown={handleMouseDown}
                            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-indigo-500/50 transition-colors z-10"
                        />
                        <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-800/30 bg-zinc-900/30">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Preview</span>
                                <span className="text-xs text-zinc-400">•</span>
                                <span className="text-xs text-zinc-300 font-medium">{getBasename(selectedFile)}</span>
                            </div>
                            <button
                                onClick={handleSaveFile}
                                disabled={isSaving || !editorContent || editorContent === fileContent.data?.content}
                                className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <Save size={14} />
                                <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar bg-[#050505] relative">
                            {fileContent.data ? (
                                selectedFile.endsWith('.md') ? (
                                    <MarkdownEditor
                                        content={fileContent.data.content ?? ""}
                                        onContentChange={setEditorContent}
                                    />
                                ) : (
                                    <CodeEditor
                                        file={selectedFile}
                                        content={fileContent.data.content ?? ""}
                                        onContentChange={setEditorContent}
                                    />
                                )
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-700 p-4 text-center text-xs">
                                    Loading content...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
